import os
import re
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)
load_dotenv(BASE_DIR.parent / "backend" / ".env", override=True)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL_CANDIDATES = [
    m.strip() for m in os.getenv("OPENAI_SUMMARY_MODELS", "gpt-4o").split(",") if m.strip()
]
try:
    SUMMARY_MAX_TOKENS = max(200, min(4096, int(os.getenv("OPENAI_SUMMARY_MAX_TOKENS", "1200"))))
except ValueError:
    SUMMARY_MAX_TOKENS = 1200


def _strip_html(text: str) -> str:
    """Teams/Slack bodies are often HTML; strip tags so the model sees substance, not markup noise."""
    if not text:
        return ""
    s = re.sub(r"<[^>]+>", " ", text)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def build_prompt(source: str, channel_name: str, messages: list) -> str:
    """
    Builds the GPT prompt from the last N messages.
    Reversed so they're in chronological order (oldest → newest).
    """
    ordered = list(reversed(messages))

    lines = []
    for msg in ordered:
        sender = msg.get("sender", "Unknown")
        raw = (msg.get("body") or "").strip()
        body = _strip_html(raw) if raw else ""
        if body:
            lines.append(f"- {sender}: {body}")

    conversation_text = "\n".join(lines) if lines else "No messages available."

    prompt = f"""You are analyzing a business conversation for AppsRow, a Webflow agency.

Platform: {source.upper()}
Channel / Group: {channel_name}

Last {len(messages)} messages (oldest → newest):
{conversation_text}

Your PRIMARY output is TASKS: a complete list of work discussed — not links alone.

Under TASKS, include EVERY distinct item that implies work, follow-up, or a decision, for example:
- explicit asks ("please change…", "can you…", "we need…")
- approvals / rejections that imply next steps
- bugs, content changes, design tweaks, deadlines, owners ("Parth will…")
- open questions that someone must answer or resolve
- status updates that create new follow-ups

Use one bullet per distinct item. Merge duplicates; split combined asks into separate bullets when they are different pieces of work.
Resolve vague pronouns using context (e.g. "make that bigger" → name the exact section/component).

LINKS and FILES are SECONDARY: only list URLs or file names that support the work above. Do not dump every URL from HTML if it is not relevant to a task. Deduplicate links.

Return ONLY the following structure. Do not add preamble or closing commentary.

TASKS:
- [Specific actionable item 1]
- [Specific actionable item 2]
FILES: [Comma-separated file names if any; omit line if none]
LINKS: [Comma-separated http(s) URLs if any; omit line if none]

Rules:
- If there are genuinely no tasks, files, or links, return exactly: NO_ACTION
- Do not invent work that is not grounded in the messages"""

    return prompt


def summarize_channel(source: str, channel_name: str, messages: list) -> tuple:
    """
    Returns (summary_text, image_urls)
    FIX: Removed early return that was inside the timestamp loop,
    causing function to exit before GPT was ever called.
    """
    if not messages:
        return "NO_ACTION", []

    # ── Collect latest timestamp ──────────────────────────────────────────────
    latest_message_at = None
    for msg in messages:
        ts = msg.get("timestamp") or msg.get("created_at") or msg.get("received_at")
        if ts:
            if latest_message_at is None or ts > latest_message_at:
                latest_message_at = ts
    # NOTE: No return here — this was the bug. Loop finishes, execution continues.

    # ── Collect image URLs from messages ──────────────────────────────────────
    image_urls = []
    for msg in messages:
        # WhatsApp / Slack — media_urls array
        for url in (msg.get("media_urls") or []):
            if url and url.startswith("http"):
                image_urls.append(url)
        # Teams — single public_url field
        url = msg.get("public_url") or ""
        if url and url.startswith("http"):
            image_urls.append(url)

    # ── Build prompt and call GPT-4o ──────────────────────────────────────────
    prompt = build_prompt(source, channel_name, messages)

    last_error = None
    for model_name in MODEL_CANDIDATES:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a thorough project assistant for AppsRow (Webflow agency). "
                            "From chat logs you must list every discussed task, follow-up, and decision that implies work. "
                            "Tasks come first and must be complete; links and files are supporting details only. "
                            "Stay faithful to the messages — do not fabricate. "
                            "Output only the structured format requested by the user."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=SUMMARY_MAX_TOKENS,
                temperature=0.1,
            )

            result = (response.choices[0].message.content or "").strip()
            if not result:
                return "NO_ACTION", image_urls
            # Accept both TASKS: and legacy TASK: tags.
            if result != "NO_ACTION" and not any(tag in result for tag in ("TASKS:", "TASK:", "FILES:", "LINKS:")):
                return "NO_ACTION", image_urls

            print(
                f"✅ Extraction done for [{source}] {channel_name} "
                f"({len(messages)} messages, {len(image_urls)} images) via {model_name}"
            )
            return result, image_urls
        except Exception as e:
            last_error = e
            print(f"⚠️ Extraction failed with {model_name} for [{source}] {channel_name}: {e}")

    error_msg = str(last_error) if last_error else "Unknown extraction error"
    return f"Extraction unavailable: {error_msg[:100]}", image_urls


def format_extraction_for_teams(raw_result: str) -> str:
    """
    Converts raw GPT extraction into a clean Teams message block.
    """
    if not raw_result or raw_result.strip() == "NO_ACTION":
        return ""

    text = raw_result.strip()
    formatted = []

    if re.search(r"(?im)^\s*TASKS:\s*", text):
        m = re.search(r"(?is)TASKS:\s*(.*?)(?=^\s*(?:FILES:|LINKS:)|\Z)", text)
        if m:
            for line in m.group(1).strip().splitlines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith(("-", "•")):
                    line = line.lstrip("-•").strip()
                elif line.upper().startswith("TASK:"):
                    line = line[5:].strip()
                if line:
                    formatted.append(f"📌 *Task:* {line}")
    else:
        for line in text.splitlines():
            ls = line.strip()
            if ls.upper().startswith("TASK:") and not ls.upper().startswith("TASKS:"):
                formatted.append(f"📌 *Task:* {ls[5:].strip()}")

    for line in text.splitlines():
        line = line.strip()
        if line.startswith("FILES:"):
            value = line[6:].strip()
            if value:
                formatted.append(f"📎 *Files:* {value}")
        elif line.startswith("LINKS:"):
            value = line[6:].strip()
            if value:
                formatted.append(f"🔗 *Links:* {value}")

    if not formatted:
        return ""

    block = "\n".join(formatted)
    return f"\n\n─────────────────────\n{block}\n─────────────────────"