from starlette.applications import Starlette
from starlette.responses import JSONResponse, PlainTextResponse
from starlette.requests import Request
from starlette.middleware.cors import CORSMiddleware
import os, httpx

app = Starlette()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.2-3b-instant"

@app.route("/", methods=["GET"])
async def health(_: Request):
    return PlainTextResponse("Chat API is running. Use POST to send messages.")

@app.route("/", methods=["POST"])
async def chat(req: Request):
    try:
        data = await req.json()
        msg = (data or {}).get("message", "").strip()
        if not msg:
            return JSONResponse({"error": "No message provided"})
        if not GROQ_API_KEY:
            return JSONResponse({"error": "GROQ_API_KEY not configured"})

        system_prompt = (
            "You are Eugene's AI assistant on his portfolio website. "
            "Keep replies concise (2–3 sentences), be friendly, and never invent facts."
        )

        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": msg},
            ],
            "max_tokens": 200,
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json=payload
            )
            r.raise_for_status()
            obj = r.json()

        content = (obj.get("choices", [{}])[0].get("message", {}) or {}).get("content", "")
        return JSONResponse({"response": content or "No response from AI"})
    except httpx.HTTPStatusError as e:
        print("Groq HTTP error:", e.response.status_code, e.response.text)
        return JSONResponse({"error": f"API Error: {e.response.status_code}"})
    except Exception as e:
        print("Chat crash:", repr(e))
        return JSONResponse({"error": "Internal error"})
