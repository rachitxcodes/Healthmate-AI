# File: ai_companion_api.py

import os
import re
import requests
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# --- 1. SETUP AND CONFIGURATION ---
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SUPABASE_URL = f"https://{os.getenv('SUPABASE_PROJECT_ID')}.supabase.co"
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not OPENROUTER_API_KEY:
    raise Exception("❌ ERROR: OPENROUTER_API_KEY missing in .env file!")
if not SUPABASE_ANON_KEY:
    raise Exception("❌ ERROR: SUPABASE_ANON_KEY missing in .env file!")

SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

router = APIRouter()
security = HTTPBearer()

PRIMARY_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"
FALLBACK_MODEL = "mistralai/mistral-small-3.1-24b-instruct:free"

SYSTEM_PROMPT = (
    "You are Dr. HealthMate, a warm, professional, and personalized AI health companion. "
    "You talk like a real doctor having a one-on-one consultation — calm, attentive, and human. "

    "STRICT CONVERSATION RULES: "
    "1. Never dump all information at once. Respond naturally turn by turn. "
    "2. When a user greets you, greet them back warmly and ask how they are feeling today. Do not mention their report unless they ask. "
    "3. Only discuss report data when the user asks about it or mentions a symptom. "
    "4. Ask one follow-up question at a time to understand their concern better before giving advice. "
    "5. Give advice gradually — first understand, then respond, then suggest if needed. "
    "6. Always end your response with exactly one question to keep the conversation going. "
    "7. Keep each response short — 2 to 4 sentences maximum unless the user asks for detail. "

    "FORMATTING RULES: "
    "Write in plain text only. No asterisks, no bold, no bullet points, no numbered lists, "
    "no markdown symbols of any kind. No emojis. Simple conversational sentences only. "

    "MEDICAL RULES: "
    "Never diagnose. Never prescribe. Always recommend consulting a licensed doctor for serious concerns."
)


# --- 2. AUTH HELPER ---

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Validate Supabase JWT and extract user ID by calling the Supabase Auth API."""
    token = credentials.credentials
    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10,
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        user_data = response.json()
        user_id = user_data.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Could not extract user ID from token.")
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed.")


# --- 3. PYDANTIC MODELS ---

class ChatIn(BaseModel):
    message: str
    report_context: Optional[str] = None

class ChatOut(BaseModel):
    response: str

class HistoryMessage(BaseModel):
    role: str
    content: str
    created_at: Optional[str] = None

class HistoryOut(BaseModel):
    messages: list[HistoryMessage]


# --- 4. MARKDOWN STRIPPER ---

def strip_markdown(text: str) -> str:
    """Remove all markdown formatting from AI response regardless of what the model outputs."""
    # Remove bold/italic (***text***, **text**, *text*, __text__, _text_)
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,2}(.*?)_{1,2}', r'\1', text)
    # Remove headers (# ## ###)
    text = re.sub(r'#{1,6}\s+', '', text)
    # Remove numbered lists (1. 2. 3.)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Remove bullet points (-, *, •)
    text = re.sub(r'^\s*[-•*]\s+', '', text, flags=re.MULTILINE)
    # Remove inline code and code blocks
    text = re.sub(r'`{1,3}.*?`{1,3}', '', text, flags=re.DOTALL)
    # Remove emojis and non-ASCII symbols
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    # Remove extra blank lines (3+ newlines → 2)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# --- 5. SUPABASE HELPERS ---

def fetch_chat_history(user_id: str) -> list[dict]:
    """Fetch last 20 messages for this user, returned in chronological order."""
    try:
        result = (
            supabase.table("chat_history")
            .select("role, content, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        # Reverse: DB returns newest-first, we want oldest-first for LLM context
        return list(reversed(result.data or []))
    except Exception as e:
        print(f"⚠️ Failed to fetch chat history: {e}")
        return []


def save_message(user_id: str, role: str, content: str):
    """Persist a single message to Supabase chat_history."""
    try:
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "role": role,
            "content": content,
        }).execute()
    except Exception as e:
        print(f"⚠️ Failed to save message (role={role}): {e}")


# --- 6. OPENROUTER CALL WITH MODEL FALLBACK ---

def call_openrouter(messages_payload: list[dict]) -> str:
    """Call OpenRouter with primary model, automatically falling back on failure."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    for model in [PRIMARY_MODEL, FALLBACK_MODEL]:
        try:
            print(f"🤖 Trying model: {model}")
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={"model": model, "messages": messages_payload},
                timeout=40,
            )
            resp.raise_for_status()
            raw_text = resp.json()["choices"][0]["message"]["content"]
            clean_text = strip_markdown(raw_text)
            print(f"✅ Response from {model}: {clean_text[:80]}...")
            return clean_text
        except Exception as e:
            print(f"⚠️ Model {model} failed: {e}")
            continue

    raise HTTPException(
        status_code=503,
        detail="All AI models are currently unavailable. Please try again later.",
    )


# --- 7. API ENDPOINTS ---

@router.get("/history", response_model=HistoryOut)
async def get_chat_history(user_id: str = Depends(get_current_user_id)):
    """
    Returns the last 20 chat messages for the authenticated user.
    Frontend calls this on mount to pre-populate the chat UI.
    """
    messages = fetch_chat_history(user_id)
    return HistoryOut(
        messages=[
            HistoryMessage(
                role=m["role"],
                content=m["content"],
                created_at=m.get("created_at"),
            )
            for m in messages
        ]
    )


@router.post("/chat", response_model=ChatOut)
async def handle_chat_message(
    payload: ChatIn,
    user_id: str = Depends(get_current_user_id),
):
    """
    Authenticated chat endpoint:
    1. Fetches last 20 messages from Supabase as conversation context
    2. Injects report data into system prompt if provided by frontend
    3. Sends full conversation to OpenRouter (primary + fallback)
    4. Strips all markdown from AI response
    5. Saves user message + AI response to Supabase
    6. Returns clean AI response
    """
    user_message = payload.message.strip()
    report_context = payload.report_context

    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    print(f"💬 User [{user_id[:8]}...]: {user_message[:80]}")

    # Build system prompt — inject report data if provided
    system_content = SYSTEM_PROMPT
    if report_context:
        system_content += (
            "\n\nThe user has recently uploaded and analysed a health report. "
            "Here is the extracted OCR data and ML risk analysis:\n"
            + report_context
            + "\n\nThis data is available as background context only. "
            "Do not mention or reference this report data unless the user brings up a symptom, "
            "asks about their report, or asks a health question that directly relates to it. "
            "Never volunteer this information unprompted."
        )

    # Fetch existing conversation history for context window
    history = fetch_chat_history(user_id)

    # Assemble the full messages array for the LLM
    messages_for_llm: list[dict] = [{"role": "system", "content": system_content}]
    for msg in history:
        if msg["role"] in ("user", "assistant"):
            messages_for_llm.append({"role": msg["role"], "content": msg["content"]})
    messages_for_llm.append({"role": "user", "content": user_message})

    # Call AI with fallback — response is already markdown-stripped
    ai_response = call_openrouter(messages_for_llm)

    # Persist both turns to Supabase
    save_message(user_id, "user", user_message)
    save_message(user_id, "assistant", ai_response)

    return ChatOut(response=ai_response)