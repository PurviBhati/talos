import os
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


def build_prompt(source: str, channel_name: str, messages: list) -> str:
    """
    Builds the GPT prompt from the last N messages.
    Reversed so they're in chronological order (oldest → newest).
    """
    ordered = list(reversed(messages))

    lines = []
    for msg in ordered:
        sender = msg.get("sender", "Unknown")
        body = (msg.get("body") or "").strip()
        if body:
            lines.append(f"- {sender}: {body}")

    conversation_text = "\n".join(lines) if lines else "No messages available."

    prompt = f"""You are analyzing a business conversation for AppsRow, a Webflow agency.

    Platform: {source.upper()}
    Channel / Group: {channel_name}

    Last {len(messages)} messages:
    {conversation_text}

    Extract the following from these messages. Return ONLY what actually exists — do not invent anything.

    Return in this exact format (skip a section entirely if nothing found):

    TASKS:
    - [First actionable task]
    - [Second actionable task]
    FILES: [Comma-separated list of any file names mentioned. If none, skip this line.]
    LINKS: [Comma-separated list of any URLs. If none, skip this line.]

    RESOLVE AMBIGUITY: If the client says "make that bigger," look at the context to identify exactly WHAT "that" is (e.g., "The Hero H1 Heading").


    Rules:  
    - TASKS should include every clear actionable request in these messages (not just one)
    - Use bullet points under TASKS (one line per task)
    - Each task item should be specific: what was requested, what needs to change, and short context
    - FILES should be exact file names, or "image" if a file was shared without a name
    - LINKS must be complete valid URLs starting with http:// or https://
    - If a field has nothing, skip that line entirely
    - If images are mentioned, describe their visual intent (e.g., "Screenshot of footer alignment issue").
    - Return only the single word NO_ACTION if ALL three fields are empty
    - Do not write any explanation or extra text"""

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
                            "You are a precise data extraction assistant for AppsRow, a Webflow agency. "
                            "Your only job is to extract tasks, file names, and links from messages. "
                            "Never summarize. Never add context. Never explain. "
                            "Return only what is explicitly present in the messages."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=150,
                temperature=0.0,
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

    lines = raw_result.strip().splitlines()
    formatted = []

    for line in lines:
        line = line.strip()
        if line.startswith("TASK:"):
            value = line[5:].strip()
            if value:
                formatted.append(f"📌 *Task:* {value}")
        elif line.startswith("FILES:"):
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