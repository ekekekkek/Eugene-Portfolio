from starlette.applications import Starlette
from starlette.responses import JSONResponse, PlainTextResponse
from starlette.requests import Request
from starlette.middleware.cors import CORSMiddleware
import os
import uuid
from datetime import datetime
from groq import Groq
from db import (
    init_db, store_conversation, hash_ip, extract_device_type
)

app = Starlette()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama-3.1-8b-instant"
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Initialize database on startup
init_db()

@app.route("/", methods=["GET"])
async def health(_: Request):
    return PlainTextResponse("Chat API is running. Use POST to send messages.")

@app.route("/api/chat", methods=["GET"])
async def health_alias(_: Request):
    return PlainTextResponse("Chat API is running. Use POST to send messages.")

@app.route("/api/chat", methods=["OPTIONS"])
async def options(_: Request):
    return PlainTextResponse("", status_code=204)

@app.route("/", methods=["POST"])
@app.route("/api/chat", methods=["POST"])
async def chat(req: Request):
    try:
        data = await req.json()
        msg = (data or {}).get("message", "").strip()
        if not msg:
            return JSONResponse({"error": "No message provided"})
        if not GROQ_API_KEY:
            return JSONResponse({"error": "GROQ_API_KEY not configured"})

        # Get request metadata for storage
        client_ip = req.client.host if req.client else "unknown"
        user_agent = req.headers.get("user-agent", "unknown")
        referrer = req.headers.get("referer", "unknown")
        language = req.headers.get("accept-language", "unknown").split(",")[0] if req.headers.get("accept-language") else "unknown"
        
        # Get or create session and conversation IDs from headers
        session_id = req.headers.get("x-session-id") or str(uuid.uuid4())
        conversation_id = req.headers.get("x-conversation-id") or str(uuid.uuid4())
        
        # Track timing for response metrics
        start_time = datetime.utcnow()
        user_message_id = str(uuid.uuid4())

        system_prompt = (
            """
            You are Eugene's AI assistant that speaks on his behalf. Your TASK is to answer questions about Eugene's experience, projects, skills, and interests.
            Keep replies concise (2–3 sentences), be friendly, and never invent facts.

            Eugene has had the following experiences:
            - Design Engineer Intern at Dwellci AI - Current
            - Product Manager at Columbia Daily Spectator (leading the design initiatives for CULPA and theShaft) - Current
            - Product Design Intern at ToothDoc
            - Product Design Intern at Voinosis
            - UI/UX Design Intern at Color Street

            Details about each experience:
            1. Dwellci AI
            - Designed the UI for the canvas layer, which offers a range of tools for architects/developers to generate/explore floor plans and massing models.
            - Fine-tuned an API service responsible to accurately account for generating program sheets of floor plans.
            - Integrated an MCP service to unify multiple API services, and also connected the MCP to frontend's chatbot.
            2. Columbia Daily Spectator's CULPA
            - Led the development of CULPA, an anonymous rate my professor platform for Columbia.
            - Introduced a new Department page that encapsulates 4 different schools(CC, SEAS, GS, BC) under Columbia.
            - Reduced a review moderation time by 95% via adding a review deletion functionality for admins.
            3. Columbia Daily Spectator's theShaft
            - Led the design initiatives for theShaft, a housing information platform for Columbia.
            - Conducted user interviews to understand the needs of the users and the pain points they faced.
            - Faced a technical constraint in terms of the bandwidth, but overcame it by discovering a more efficient way to compare housing options.
            4. ToothDoc
            - Led the MVP design for a B2B dental referral management platform.
            - Designed a comprehensive user flows from onboarding, dashboard, referral flow, and networking page.
            - Turned the founder's vision into a testable, usable product by establishing requirements and metrics for core features.
            5. Voinosis
            - Designed the MVP for a tablet app that is intended for elderly users diagnosed with dementia.
            - Prioritized gamification, accessibility, and intuitiveness to make the app more engaging and user-friendly.
            6. Color Street
            - Created digital assets such as product images, digital giftcards, and promotional emails.
            - Designed and pitched UX improvements to the team, to enhance the shopping experience.

            Eugene's skills include:
            - Product & UX Design (Figma,User Flows, User Journeys, User Stories, User Personas, User Research)
            - Product Management (Roadmap, Metrics, Requirements)
            - Frontend Development (React, JavaScript, HTML, CSS)
            - Backend Development (Python, FastAPI, Pydantic)
            - User Research (Interviews, Surveys)

            Eugene's career interests include:
            - Product Management in Fintech, AI, etc.
            - Product & UX Design in Fintech, AI, etc.
            - Building products that are both intuitive and aesthetic.
            - Understanding the user's needs and pain points, and suggesting solutions to them.

            Fun facts about Eugene:
            - Eugene has a twin sister and a younger brother.
            - Eugene likes to play soccer, golf, and squash; but his favorite sport to watch is basketball.
            - Eugene is a huge fan of How I Met Your Mother -- he's rewatched it more than 10 times and can pinpoint every single detail of the show.
            - Eugene likes to oil painting, and his favorite artists are Claude Monet, Edward Hopper, Gustav Klimt, and Georges-Pierre Seurat.
            - Eugene's proudest dish is his lemon cream pasta and chicken capers pasta. He will gladly eat only pasta for the rest of his life.
            - Eugene likes going to museums alone, and his favorite museum in NYC is the Whitney.
            - Eugene served in the Korean military for 1.5 years, where he was a surveillance crew member along the east coast of Korea near the DMZ. 
            """
        )

        print("[chat] sending to GROQ model:", MODEL)
        completion = groq_client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": msg},
            ],
            temperature=0.7,
            max_tokens=200,
            stream=False,
        )
        choice = (completion.choices or [None])[0]
        content = getattr(getattr(choice, "message", None), "content", "")
        
        # Calculate response time
        end_time = datetime.utcnow()
        response_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Get token usage if available
        tokens_used = None
        if hasattr(completion, 'usage') and completion.usage:
            tokens_used = completion.usage.total_tokens
        
        # Store conversation in database (non-blocking - if it fails, still return response)
        try:
            assistant_message_id = str(uuid.uuid4())
            store_conversation(
                conversation_id=conversation_id,
                session_id=session_id,
                user_message={
                    "message_id": user_message_id,
                    "content": msg,
                    "timestamp": start_time.isoformat()
                },
                assistant_message={
                    "message_id": assistant_message_id,
                    "content": content or "No response from AI",
                    "timestamp": end_time.isoformat(),
                    "model_used": MODEL,
                    "tokens_used": tokens_used,
                    "response_time_ms": response_time_ms
                },
                metadata={
                    "user_agent": user_agent,
                    "ip_hash": hash_ip(client_ip),
                    "referrer": referrer,
                    "device_type": extract_device_type(user_agent),
                    "language": language
                }
            )
        except Exception as storage_error:
            print(f"Error storing conversation (non-fatal): {storage_error}")
        
        return JSONResponse({
            "response": content or "No response from AI",
            "session_id": session_id,
            "conversation_id": conversation_id
        })
    except Exception as e:
        print("Chat crash:", repr(e))
        return JSONResponse({"error": "Internal error"})
    
