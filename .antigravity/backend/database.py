import sqlite3
import bcrypt
import jwt
import os
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aidebater.db")

from dotenv import load_dotenv
load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET", "ai-debater-secret-key-2026")
JWT_ALGO = "HS256"

def get_db():
    """Get DB connection with row factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    """Create tables if they don't exist"""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            tokens_used INTEGER DEFAULT 0,
            requests_sent INTEGER DEFAULT 0,
            is_limited BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS debates (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            data TEXT NOT NULL,
            status TEXT DEFAULT 'running',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            history TEXT NOT NULL,
            status TEXT DEFAULT 'running',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    # Try altering schema for existing users table
    try:
        conn.executescript("""
            ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;
            ALTER TABLE users ADD COLUMN tokens_used INTEGER DEFAULT 0;
            ALTER TABLE users ADD COLUMN requests_sent INTEGER DEFAULT 0;
            ALTER TABLE users ADD COLUMN is_limited BOOLEAN DEFAULT 0;
        """)
    except sqlite3.OperationalError:
        pass  # Columns likely already exist
        
    # Seed admin privileges
    conn.execute("UPDATE users SET is_admin = 1 WHERE username = 'admin'")
    conn.commit()
    conn.close()

def create_user(username: str, password: str) -> dict | None:
    """Register a new user with hashed password"""
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    is_admin = 1 if username == "admin" else 0
    conn = get_db()
    try:
        conn.execute("INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
                     (username, password_hash, is_admin))
        conn.commit()
        user_id = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()["id"]
        conn.close()
        return {"id": user_id, "username": username, "is_admin": is_admin, "is_limited": 0}
    except sqlite3.IntegrityError:
        conn.close()
        return None  # Username taken

def verify_user(username: str, password: str) -> dict | None:
    """Verify login credentials"""
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if row and bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
        return {"id": row["id"], "username": row["username"], "is_admin": row["is_admin"], "is_limited": row["is_limited"]}
    return None

def generate_token(user_id: int, username: str, is_admin: int = 0, is_limited: int = 0) -> str:
    """Create JWT token"""
    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "is_limited": is_limited,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def verify_token(token: str) -> dict | None:
    """Decode and verify JWT"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def save_debate(debate_id: str, user_id: int, topic: str, data: dict, status: str = "running"):
    """Save or update debate in DB"""
    conn = get_db()
    conn.execute("""
        INSERT INTO debates (id, user_id, topic, data, status)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = ?, status = ?
    """, (debate_id, user_id, topic, json.dumps(data), status, json.dumps(data), status))
    conn.commit()
    conn.close()

def get_user_debates(user_id: int) -> list:
    """Get all debates for a user"""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, topic, status, created_at FROM debates WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_debate_by_id(debate_id: str) -> dict | None:
    """Get a specific debate"""
    conn = get_db()
    row = conn.execute("SELECT * FROM debates WHERE id = ?", (debate_id,)).fetchone()
    conn.close()
    if row:
        result = dict(row)
        result["data"] = json.loads(result["data"])
        return result
    return None

# --- Admin & Stats Helpers ---
def get_all_users() -> list:
    conn = get_db()
    rows = conn.execute("""
        SELECT u.id, u.username, u.is_admin, u.tokens_used, u.requests_sent, u.is_limited, u.created_at,
               (SELECT COUNT(*) FROM debates WHERE user_id = u.id) as total_debates,
               (SELECT COUNT(*) FROM chats WHERE user_id = u.id) as total_chats
        FROM users u
        ORDER BY u.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_platform_stats() -> dict:
    conn = get_db()
    stats = conn.execute("""
        SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT SUM(tokens_used) FROM users) as total_tokens,
            (SELECT SUM(requests_sent) FROM users) as total_requests,
            (SELECT COUNT(*) FROM debates) as total_debates,
            (SELECT COUNT(*) FROM chats) as total_chats
    """).fetchone()
    conn.close()
    return dict(stats) if stats else {}

def get_user_details(user_id: int) -> dict | None:
    conn = get_db()
    # User info
    user_row = conn.execute("SELECT id, username, is_admin, tokens_used, requests_sent, is_limited, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user_row:
        conn.close()
        return None
    user_data = dict(user_row)
    
    # Debates
    debates_rows = conn.execute("SELECT id, topic, status, created_at FROM debates WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    user_data["debates"] = [dict(r) for r in debates_rows]
    
    # Chats
    chats_rows = conn.execute("SELECT id, topic, status, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    user_data["chats"] = [dict(r) for r in chats_rows]
    
    conn.close()
    return user_data

def update_user_stats(user_id: int, tokens: int):
    conn = get_db()
    conn.execute("""
        UPDATE users 
        SET tokens_used = tokens_used + ?, requests_sent = requests_sent + 1 
        WHERE id = ?
    """, (tokens, user_id))
    conn.commit()
    conn.close()

def delete_user(user_id: int):
    conn = get_db()
    conn.execute("DELETE FROM debates WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM chats WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

def toggle_user_limit(user_id: int):
    conn = get_db()
    conn.execute("UPDATE users SET is_limited = CASE WHEN is_limited = 1 THEN 0 ELSE 1 END WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

def change_user_password(user_id: int, new_password: str):
    password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    conn = get_db()
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
    conn.commit()
    conn.close()

# --- Normal Chat Helpers ---
def save_chat(chat_id: str, user_id: int, topic: str, history: list, status: str = "running"):
    conn = get_db()
    conn.execute("""
        INSERT INTO chats (id, user_id, topic, history, status)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET history = ?, status = ?
    """, (chat_id, user_id, topic, json.dumps(history), status, json.dumps(history), status))
    conn.commit()
    conn.close()

def get_user_chats(user_id: int) -> list:
    conn = get_db()
    rows = conn.execute(
        "SELECT id, topic, status, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_chat_by_id(chat_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
    conn.close()
    if row:
        result = dict(row)
        result["history"] = json.loads(result["history"])
        return result
    return None

def delete_chat(chat_id: str, user_id: int) -> bool:
    conn = get_db()
    cursor = conn.execute("DELETE FROM chats WHERE id = ? AND user_id = ?", (chat_id, user_id))
    rows_deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_deleted > 0

# Initialize DB on import
init_db()
