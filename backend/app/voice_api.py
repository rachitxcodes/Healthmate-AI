"""
Voice API for HealthMate AI — TTS (report/explanation voice-out) and
STT (voice input for the Dr. HealthMate AI chat companion), both backed
by Gnani.ai's Vachana platform.

Drop into: backend/app/voice_api.py
Register in main.py the same way your other *_api.py modules are registered:

    from app.voice_api import router as voice_router
    app.include_router(voice_router)

Add to backend/.env:

    GNANI_API_KEY=your_gnani_api_key_here
    GNANI_TTS_URL=https://api.vachana.ai/api/v1/tts/inference
    GNANI_STT_URL=https://api.vachana.ai/stt/v3
    GNANI_VOICE=Pranav
    GNANI_TTS_MODEL=timbre-v2.0

Install httpx and python-multipart if not already present:
    pip install httpx python-multipart
"""

import os
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["voice"])

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GNANI_TTS_URL = os.getenv("GNANI_TTS_URL", "https://api.vachana.ai/api/v1/tts/inference")
GNANI_STT_URL = os.getenv("GNANI_STT_URL", "https://api.vachana.ai/stt/v3")
GNANI_VOICE = os.getenv("GNANI_VOICE", "Pranav")
GNANI_TTS_MODEL = os.getenv("GNANI_TTS_MODEL", "timbre-v2.0")


def _require_key():
    if not GNANI_API_KEY:
        raise HTTPException(status_code=503, detail="Gnani API key not configured")


# ---------------------------------------------------------------------------
# TTS — used for report/explanation voice-out (same pattern as MediCheck AI)
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    text: str
    voice: str = GNANI_VOICE
    model: str = GNANI_TTS_MODEL
    language: str = "auto"


@router.post("/tts")
async def synthesize_speech(payload: TTSRequest):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Missing text in request body")
    _require_key()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GNANI_TTS_URL,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key-ID": GNANI_API_KEY,
                },
                json={
                    "text": payload.text,
                    "voice": payload.voice,
                    "model": payload.model,
                    "language": payload.language,
                    "audio_config": {
                        "sample_rate": 44100,
                        "num_channels": 1,
                        "sample_width": 2,
                        "encoding": "linear_pcm",
                        "container": "wav",
                    },
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"TTS provider unreachable: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return Response(content=response.content, media_type="audio/wav")


# ---------------------------------------------------------------------------
# STT — used for voice input in the Dr. HealthMate AI chat companion
# ---------------------------------------------------------------------------

@router.post("/stt")
async def transcribe_speech(
    audio_file: UploadFile = File(...),
    language_code: str = Form("en-IN"),
):
    _require_key()

    audio_bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GNANI_STT_URL,
                headers={"X-API-Key-ID": GNANI_API_KEY},
                files={
                    "audio_file": (
                        audio_file.filename or "recording.wav",
                        audio_bytes,
                        audio_file.content_type or "audio/wav",
                    )
                },
                data={
                    "language_code": language_code,
                    "preferred_language": language_code,
                    "format": "transcribe",
                    "itn_native_numerals": "true",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"STT provider unreachable: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    data = response.json()
    return {"transcript": data.get("transcript", "")}