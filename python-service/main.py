import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db import (
    ensure_summaries_table,
    fetch_all_channels,
    fetch_last_messages,
    save_summary,
    get_summary,
)
from summarizer import summarize_channel
from scheduler import start_scheduler

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)
load_dotenv(BASE_DIR.parent / "backend" / ".env", override=True)


def get_cors_origins():
    configured = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
    if configured:
        return configured
    return [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5000",
    ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] OpenClaw Python Service starting...")
    from db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE channel_summaries ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE channel_summaries ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'")
            cur.execute("ALTER TABLE channel_summaries ADD COLUMN IF NOT EXISTS latest_message_at TIMESTAMPTZ")
            conn.commit()
        print("[ok] DB migrations done")
    except Exception as e:
        print(f"[warn] Migration warning: {e}")
    finally:
        conn.close()

    start_scheduler()
    print("[ok] Python service ready on port 8000")
    yield


app = FastAPI(
    title="OpenClaw Python Service",
    description="Chat summarization layer for OpenClaw unified messaging hub",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "OpenClaw Python Summarizer"}


@app.post("/summarize/all")
async def summarize_all():
    """
    Summarizes last 20 messages from every channel across all platforms.
    FIX: summarize_channel now returns (summary, image_urls) — 2 values only.
    """
    try:
        channels = fetch_all_channels()

        if not channels:
            return {"success": True, "message": "No channels found", "results": []}

        results = []

        for ch in channels:
            try:
                messages = fetch_last_messages(
                    source=ch["source"],
                    channel_id=ch["channel_id"],
                    channel_col=ch["channel_col"],
                )

                if not messages:
                    results.append({
                        "source": ch["source"],
                        "channel": ch["channel_name"],
                        "status": "skipped",
                        "reason": "no messages"
                    })
                    continue

                # FIX: unpack 2 values only (not 3)
                summary, image_urls = summarize_channel(
                    source=ch["source"],
                    channel_name=ch["channel_name"],
                    messages=messages
                )

                save_summary(
                    source=ch["source"],
                    channel_id=ch["channel_id"],
                    channel_name=ch["channel_name"],
                    summary_text=summary,
                    message_count=len(messages),
                    image_urls=image_urls
                )

                await asyncio.sleep(0.1)

                results.append({
                    "source": ch["source"],
                    "channel": ch["channel_name"],
                    "status": "success",
                    "message_count": len(messages)
                })

            except Exception as e:
                print(f"[error] Error summarizing [{ch['source']}] {ch['channel_name']}: {e}")
                results.append({
                    "source": ch["source"],
                    "channel": ch["channel_name"],
                    "status": "error",
                    "reason": str(e)
                })

        success = sum(1 for r in results if r["status"] == "success")
        print(f"[ok] Summarization complete: {success}/{len(channels)} channels")
        return {
            "success": True,
            "total_channels": len(channels),
            "summarized": success,
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/{source}/{channel_id:path}")
async def summarize_one(source: str, channel_id: str):
    source = (source or "").strip().lower()
    CHANNEL_COL_MAP = {
        "teams":    "chat_name",
        "slack":    "channel_name",
        "whatsapp": "group_name",
    }

    col = CHANNEL_COL_MAP.get(source)
    if not col:
        raise HTTPException(status_code=400, detail=f"Unknown source: {source}")

    try:
        messages = fetch_last_messages(
            source=source,
            channel_id=channel_id,
            channel_col=col,
        )

        if not messages:
            return {"success": False, "message": "No messages found for this channel"}

        # FIX: unpack 2 values
        summary, image_urls = summarize_channel(
            source=source,
            channel_name=channel_id,
            messages=messages
        )

        save_summary(
            source=source,
            channel_id=channel_id,
            channel_name=channel_id,
            summary_text=summary,
            message_count=len(messages),
            image_urls=image_urls
        )

        return {
            "success": True,
            "source": source,
            "channel_id": channel_id,
            "message_count": len(messages),
            "summary": summary
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/summary/{source}/{channel_id:path}")
async def get_channel_summary(source: str, channel_id: str):
    try:
        result = get_summary(source=source, channel_id=channel_id)

        if not result:
            return {
                "success": False,
                "message": "No summary found. Run /summarize/all first.",
                "summary": None
            }

        if result.get("last_updated"):
            result["last_updated"] = str(result["last_updated"])

        return {"success": True, **result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summary/{source}/{channel_id:path}/dismiss")
async def dismiss_summary(source: str, channel_id: str):
    from db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE channel_summaries SET dismissed = TRUE WHERE source = %s AND channel_id = %s",
                (source, channel_id)
            )
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/summaries")
async def list_all_summaries():
    from db import get_connection
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT channel_id, source, channel_name, summary_text,
                       message_count, last_updated, image_urls
                FROM channel_summaries
                WHERE (dismissed IS NULL OR dismissed = FALSE)
                  AND summary_text != 'NO_ACTION'
                  AND summary_text NOT LIKE 'Extraction unavailable%'
                ORDER BY COALESCE(latest_message_at, last_updated) DESC
            """)
            rows = cur.fetchall()
            results = []
            for row in rows:
                r = dict(row)
                if r.get("last_updated"):
                    r["last_updated"] = str(r["last_updated"])
                results.append(r)
        return {"success": True, "count": len(results), "summaries": results}
    finally:
        conn.close()