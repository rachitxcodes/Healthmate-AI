# File: ai_companion_api.py

import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# --- 1. SETUP AND CONFIGURATION ---
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    raise Exception("❌ ERROR: OPENROUTER_API_KEY missing in .env file!")

router = APIRouter()

# --- 2. PYDANTIC MODELS (Data Shapes) ---

class ChatIn(BaseModel):
    """The shape of the incoming request from the frontend."""
    message: str

class ChatOut(BaseModel):
    """The shape of the response we send back to the frontend."""
    response: str

# --- 3. THE API ENDPOINT ---

@router.post("/chat", response_model=ChatOut)
async def handle_chat_message(payload: ChatIn):
    """
    Receives a message from the user, gets a response from an LLM,
    and returns the AI's reply.
    """
    user_message = payload.message
    print(f"💬 Received chat message: '{user_message}'")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    # The payload for the OpenRouter API
    json_payload = {
        # We use a powerful, free chat model.
        "model": "nvidia/nemotron-nano-12b-v2-vl:free",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are HealthMate AI, a calm and professional health companion. "
                    "Provide supportive, general wellness advice and insights. "
                    "You must NOT give medical diagnoses or prescribe treatments. "
                    "Keep your responses concise, encouraging, and easy to understand."
                    "You must always respond in plain text only. "
                    "Do not use any Markdown formatting. "
                    "Do not use #, ##, ###, bullets, bold text, italics, code blocks, links, or any special formatting."
                    "Write everything as simple plain sentences without symbols or decoration."
                )
            },
            {
                "role": "user",
                "content": user_message
            }
        ]
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=json_payload,
            timeout=30 # 30-second timeout
        )
        response.raise_for_status() # Will raise an exception for 4xx/5xx errors

        result = response.json()
        ai_response_text = result["choices"][0]["message"]["content"]
        
        print(f"🤖 AI Response: '{ai_response_text}'")
        return ChatOut(response=ai_response_text)

    except requests.exceptions.RequestException as e:
        print(f"❌ API Request Error: {e}")
        raise HTTPException(status_code=503, detail="The AI service is currently unavailable. Please try again later.")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")