import os
import requests
import psycopg
from psycopg.rows import dict_row

# Hardcoded fallback — no dotenv needed
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:appsrow123@localhost:5432/unifiedhub"
)

NODE_URL = os.environ.get("NODE_URL", "http://localhost:5000")


def get_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def _safe_get_json(url: str):
    try:
        r = requests.get(url, timeout=10)
        if not r.ok:
            print(f"⚠️ API returned {r.status_code} for {url}")
            return []
        data = r.json()
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"❌ API fetch failed {url}: {e}")
        return []


def _sort_recent(messages):
    def _key(m):
        return m.get("timestamp") or m.get("created_at") or ""
    return sorted(messages, key=_key, reverse=True)


def fetch_all_channels():
    channels = []

    messages = _safe_get_json(f"{NODE_URL}/api/teams/messages/chats")
    seen = set()
    for m in messages:
        name = m.get("chat_name")
        if name and name not in seen:
            seen.add(name)
            channels.append({
                "source": "teams",
                "channel_id": name,
                "channel_name": name,
                "channel_col": "chat_name"
            })

    messages = _safe_get_json(f"{NODE_URL}/api/slack/messages")
    seen = set()
    for m in messages:
        name = m.get("channel_name") or m.get("channel_id")
        if name and name not in seen:
            seen.add(name)
            channels.append({
                "source": "slack",
                "channel_id": name,
                "channel_name": name,
                "channel_col": "channel_name"
            })

    messages = _safe_get_json(f"{NODE_URL}/api/whatsapp/messages")
    seen = set()
    for m in messages:
        name = m.get("group_name")
        if name and name not in seen:
            seen.add(name)
            channels.append({
                "source": "whatsapp",
                "channel_id": name,
                "channel_name": name,
                "channel_col": "group_name"
            })

    print(f"📋 Found {len(channels)} channels")
    return channels


def fetch_last_messages(source: str, channel_id: str, channel_col: str, limit: int = 20):
    try:
        if source == "slack":
            messages = _safe_get_json(f"{NODE_URL}/api/slack/messages")
            picked = [m for m in messages if m.get("channel_name") == channel_id or m.get("channel_id") == channel_id]
            return _sort_recent(picked)[:limit]

        elif source == "whatsapp":
            messages = _safe_get_json(f"{NODE_URL}/api/whatsapp/messages")
            picked = [m for m in messages if m.get("group_name") == channel_id]
            return _sort_recent(picked)[:limit]

        elif source == "teams":
            messages = _safe_get_json(f"{NODE_URL}/api/teams/messages/chats")
            picked = [m for m in messages if m.get("chat_name") == channel_id]
            return _sort_recent(picked)[:limit]

        return []
    except Exception as e:
        print(f"❌ fetch_last_messages error [{source}] {channel_id}: {e}")
        return []


def save_summary(source: str, channel_id: str, channel_name: str, summary_text: str, message_count: int, image_urls: list = []):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO channel_summaries 
                    (channel_id, source, channel_name, summary_text, message_count, image_urls, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (channel_id, source)
                DO UPDATE SET
                    summary_text  = EXCLUDED.summary_text,
                    channel_name  = EXCLUDED.channel_name,
                    message_count = EXCLUDED.message_count,
                    image_urls    = EXCLUDED.image_urls,
                    last_updated  = NOW()
            """, (channel_id, source, channel_name, summary_text, message_count, image_urls))
            conn.commit()
            print(f"✅ Summary saved [{source}] {channel_name}")
    except Exception as e:
        print(f"❌ save_summary error: {e}")
    finally:
        conn.close()


def get_summary(source: str, channel_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT channel_id, source, channel_name, summary_text, message_count, last_updated
                FROM channel_summaries
                WHERE channel_id = %s AND source = %s
            """, (channel_id, source))
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"❌ get_summary error: {e}")
        return None
    finally:
        conn.close()


def ensure_summaries_table():
    print("✅ channel_summaries table already exists")