import os
import threading
import time
from dotenv import load_dotenv

load_dotenv()
# scheduler.py
# Runs every 2 hours — no APScheduler imports needed
INTERVAL_SECONDS = 2 * 60 * 60


def run_full_summarization():
    from db import fetch_all_channels, fetch_last_messages, save_summary
    from summarizer import summarize_channel

    print("🔄 Scheduler: Starting full summarization run...")

    try:
        channels = fetch_all_channels()
        print(f"📋 Found {len(channels)} channels to summarize")

        success_count = 0
        fail_count = 0

        for ch in channels:
            try:
                messages = fetch_last_messages(
                    source=ch["source"],
                    channel_id=ch["channel_id"],
                    channel_col=ch["channel_col"],
                )

                if not messages:
                    print(f"⏭️  Skipping [{ch['source']}] {ch['channel_name']} — no messages")
                    continue

                # FIX: unpack tuple (summary, image_urls) — same as main.py
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
                    image_urls=image_urls  # FIX: pass image_urls to save_summary
                )

                success_count += 1
                print(f"✅ [{ch['source']}] {ch['channel_name']} — done ({len(messages)} messages, {len(image_urls)} images)")

            except Exception as e:
                print(f"❌ Failed [{ch['source']}] {ch['channel_name']}: {str(e)}")
                fail_count += 1

        print(f"✅ Summarization complete — {success_count} succeeded, {fail_count} failed")

    except Exception as e:
        print(f"❌ Scheduler job crashed: {str(e)}")


def _scheduler_loop():
    while True:
        time.sleep(INTERVAL_SECONDS)
        run_full_summarization()


def start_scheduler():
    """
    Starts a background thread that runs summarization every 2 hours.
    Uses plain Python threading — no external scheduler library needed.
    """
    thread = threading.Thread(target=_scheduler_loop, daemon=True)
    thread.start()
    print("⏰ Scheduler started — summarization runs every 2 hours")
    return thread