import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
//aiService.js - handles AI interactions for message classification and draft generation
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/**
 * Classifies an incoming message.
 * Returns: { should_forward, category, priority, reason, task, files, links }
 */
export const classifyMessage = async (message) => {
  try {
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.0,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a message classifier for AppsRow, a Webflow agency.
Analyze the message and create tasks for the team if the client is requesting something. Identify any files or links mentioned.
Classify the message into one of the following categories: change_request, new_project, feedback, question, urgent, follow_up, greeting, spam, other.
Determine if the message should be forwarded to the team (should_forward) based on its content and category.
Metions task name, files, and links if they are mentioned in the message. Tasks should be action-oriented and clearly outlined if the client is requesting something. Acknowledge any files mentioned but do not describe them in detail. 
Don't forward greetings, spam, one-word replies, or calls.

{
  "should_forward": true or false,
  "category": one of ["change_request", "new_project", "feedback", "question", "urgent", "follow_up", "greeting", "spam", "other"],
  "priority": one of ["high", "medium", "low"],
  "reason": "one sentence explanation",
  "task": "short action-oriented task name if client is requesting something, else null",
  "files": ["list of any file names mentioned, else empty array"],
  "links": ["list of any URLs mentioned, else empty array"]
}

Rules:
- should_forward = false for greetings, spam, one-word replies, calls
- Tasks should be clearly outlined if the client is requesting something
- Links of files mentioned should be included as hyperlinks in the draft 
- Files mentioned should be acknowledged but not described in detail
- Images should be show in preview
- It should show Task name, files, and links if they are mentioned in the message
- task must be null if no clear action is being requested
- Return only valid JSON, no explanation, no markdown`
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const raw = response.choices[0].message.content.trim();
    return JSON.parse(raw);

  } catch (error) {
    console.error("❌ classifyMessage error:", error);
    // Safe fallback — don't block forwarding on AI failure
    return {
      should_forward: true,
      category: "other",
      priority: "medium",
      reason: "Classification failed, forwarded by default",
      task: null,
      files: [],
      links: []
    };
  }
};

/**
 * Generates a professional reply draft for a given message.
 * Returns a clean draft string ready to review and send.
 */
export const generateDraft = async (message) => {
  try {
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a professional client communication assistant for AppsRow, a Webflow agency.
Write a clear, polite reply draft to the client message.

Rules:
- Keep it concise, make it bullet points if it helps clarity
- Sound professional but friendly
- ignore any irrelevant information
- Do not make up specific details, dates, or promises
- If the message is a request, acknowledge it and outline the next steps without committing to specifics
- End with an offer to help or a next step
- Include a subject line`
        },
        {
          role: "user",
          content: `Write a reply draft for this client message:\n\n"${message}"`
        }
      ]
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error("❌ generateDraft error:", error);
    throw error;
  }
};