from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid
import json
import os
from debater import start_debate_workflow
from chatter import chat_workflow
from database import (
    create_user, verify_user, generate_token, verify_token,
    save_debate, get_user_debates, get_debate_by_id,
    get_all_users, get_platform_stats, delete_user, toggle_user_limit, change_user_password, get_user_details,
    get_user_chats, get_chat_by_id, save_chat, delete_chat
)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Frontend dir
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- Models ---
class DebateRequest(BaseModel):
    topic: str

class AuthRequest(BaseModel):
    username: str
    password: str

class AdminPasswordRequest(BaseModel):
    new_password: str

class ChatRequest(BaseModel):
    topic: str

class ChatMessageRequest(BaseModel):
    message: str

# --- Auth helper ---
def get_current_user(request: Request) -> dict:
    """Extract user from Authorization header"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = verify_token(auth[7:])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user

def check_admin(user: dict):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

from fastapi.staticfiles import StaticFiles

# --- Static file routes ---
FRONTEND_DIST = os.path.join(FRONTEND_DIR, "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")


# --- Auth endpoints ---
@app.post("/api/auth/signup")
async def signup(req: AuthRequest):
    if len(req.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be 3+ characters")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be 6+ characters")
    user = create_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=409, detail="Username already taken")
    token = generate_token(user["id"], user["username"], user.get("is_admin", 0), user.get("is_limited", 0))
    return {"token": token, "username": user["username"], "is_admin": user.get("is_admin", 0)}

@app.post("/api/auth/login")
async def login(req: AuthRequest):
    user = verify_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = generate_token(user["id"], user["username"], user.get("is_admin", 0), user.get("is_limited", 0))
    return {"token": token, "username": user["username"], "is_admin": user.get("is_admin", 0)}

@app.get("/api/auth/me")
async def get_me(request: Request):
    user = get_current_user(request)
    return {"username": user["username"], "user_id": user["user_id"]}

# --- Debate endpoints ---
@app.post("/api/debate/start")
async def start_debate(req: DebateRequest, request: Request, background_tasks: BackgroundTasks):
    user = get_current_user(request)
    if user.get("is_limited"):
        raise HTTPException(status_code=403, detail="Account is limited")
    
    debate_id = str(uuid.uuid4())
    debate_data = {"id": debate_id, "topic": req.topic, "status": "running", "rounds": []}

    # Save to file (for polling) and DB
    debate_file = f"debates_{debate_id}.json"
    with open(debate_file, "w") as f:
        json.dump(debate_data, f)

    save_debate(debate_id, user["user_id"], req.topic, debate_data, "running")

    # Start background workflow
    background_tasks.add_task(start_debate_workflow, req.topic, debate_id, user["user_id"])
    return {"debate_id": debate_id, "status": "started"}

@app.get("/api/debate/{debate_id}")
async def get_debate(debate_id: str):
    # Try file first (live debate), then DB
    debate_file = f"debates_{debate_id}.json"
    if os.path.exists(debate_file):
        with open(debate_file, "r") as f:
            return json.load(f)
    # Fallback to DB
    db_debate = get_debate_by_id(debate_id)
    if db_debate:
        return db_debate["data"]
    raise HTTPException(status_code=404, detail="Debate not found")

@app.get("/api/debates/history")
async def debate_history(request: Request):
    user = get_current_user(request)
    debates = get_user_debates(user["user_id"])
    return {"debates": debates}

# --- Admin endpoints ---
@app.get("/api/admin/users")
async def admin_get_users(request: Request):
    user = get_current_user(request)
    check_admin(user)
    return {"users": get_all_users()}

@app.get("/api/admin/stats")
async def admin_get_stats(request: Request):
    user = get_current_user(request)
    check_admin(user)
    return get_platform_stats()

@app.get("/api/admin/users/{target_id}")
async def admin_get_user_details(target_id: int, request: Request):
    user = get_current_user(request)
    check_admin(user)
    details = get_user_details(target_id)
    if not details:
        raise HTTPException(status_code=404, detail="User not found")
    return details

@app.delete("/api/admin/users/{target_id}")
async def admin_delete_user(target_id: int, request: Request):
    user = get_current_user(request)
    check_admin(user)
    delete_user(target_id)
    return {"success": True}

@app.post("/api/admin/users/{target_id}/limit")
async def admin_limit_user(target_id: int, request: Request):
    user = get_current_user(request)
    check_admin(user)
    toggle_user_limit(target_id)
    return {"success": True}

@app.put("/api/admin/users/{target_id}/password")
async def admin_change_password(target_id: int, req: AdminPasswordRequest, request: Request):
    user = get_current_user(request)
    check_admin(user)
    change_user_password(target_id, req.new_password)
    return {"success": True}

# --- Normal Chat endpoints ---
@app.post("/api/chat/start")
async def start_chat(req: ChatRequest, request: Request):
    user = get_current_user(request)
    if user.get("is_limited"):
        raise HTTPException(status_code=403, detail="Account is limited")
    chat_id = str(uuid.uuid4())
    history = []
    save_chat(chat_id, user["user_id"], req.topic, history, "running")
    return {"chat_id": chat_id, "status": "started"}

@app.post("/api/chat/{chat_id}/message")
async def send_chat_message(chat_id: str, req: ChatMessageRequest, request: Request, background_tasks: BackgroundTasks):
    user = get_current_user(request)
    if user.get("is_limited"):
        raise HTTPException(status_code=403, detail="Account is limited")
        
    chat_data = get_chat_by_id(chat_id)
    if not chat_data or chat_data["user_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    background_tasks.add_task(chat_workflow, chat_id, user["user_id"], req.message)
    return {"status": "processing"}

@app.get("/api/chat/{chat_id}")
async def get_chat(chat_id: str, request: Request):
    user = get_current_user(request)
    chat_data = get_chat_by_id(chat_id)
    if not chat_data or chat_data["user_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat_data

@app.delete("/api/chat/{chat_id}")
async def delete_user_chat(chat_id: str, request: Request):
    user = get_current_user(request)
    success = delete_chat(chat_id, user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found or unauthorized")
    return {"success": True}

@app.get("/api/chats/history")
async def chat_history(request: Request):
    user = get_current_user(request)
    return {"chats": get_user_chats(user["user_id"])}

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve React frontend (index.html) for all non-API routes"""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"message": "API is running. If in dev mode, run `npm run dev` in the frontend folder."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
