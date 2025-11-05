"""
Database utilities for conversation storage.
Handles PostgreSQL connections and conversation/message storage.
"""
import os
import hashlib
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

# Database connection pool
connection_pool = None

def get_db_connection():
    """Get a database connection from the pool or create a new one."""
    global connection_pool
    
    # Get database URL from environment (Vercel Postgres provides POSTGRES_URL)
    db_url = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")
    
    if not db_url:
        print("Warning: No database URL found. Conversation storage disabled.")
        return None
    
    try:
        if connection_pool is None:
            # Create connection pool
            connection_pool = psycopg2.pool.SimpleConnectionPool(
                1, 10,
                dsn=db_url,
                connect_timeout=5
            )
        
        return connection_pool.getconn()
    except Exception as e:
        print(f"Error getting database connection: {e}")
        return None

def return_db_connection(conn):
    """Return a connection to the pool."""
    global connection_pool
    if connection_pool and conn:
        try:
            connection_pool.putconn(conn)
        except Exception as e:
            print(f"Error returning connection to pool: {e}")

def hash_ip(ip: str) -> str:
    """Hash IP address for privacy."""
    if not ip or ip == "unknown":
        return "unknown"
    return hashlib.sha256(ip.encode()).hexdigest()[:16]  # First 16 chars for brevity

def extract_device_type(user_agent: str) -> str:
    """Extract device type from user agent."""
    if not user_agent or user_agent == "unknown":
        return "unknown"
    
    ua_lower = user_agent.lower()
    if 'mobile' in ua_lower or 'android' in ua_lower or 'iphone' in ua_lower:
        return 'mobile'
    elif 'tablet' in ua_lower or 'ipad' in ua_lower:
        return 'tablet'
    return 'desktop'

def init_db():
    """Initialize database tables if they don't exist."""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            # Create conversations table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    conversation_id VARCHAR(36) PRIMARY KEY,
                    session_id VARCHAR(36) NOT NULL,
                    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    ended_at TIMESTAMPTZ,
                    message_count INTEGER DEFAULT 0,
                    user_agent TEXT,
                    ip_hash VARCHAR(32),
                    referrer TEXT,
                    device_type VARCHAR(20),
                    language VARCHAR(10),
                    timezone VARCHAR(50),
                    first_message TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            
            # Create messages table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    message_id VARCHAR(36) PRIMARY KEY,
                    conversation_id VARCHAR(36) NOT NULL,
                    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    model_used VARCHAR(50),
                    tokens_used INTEGER,
                    response_time_ms INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
                )
            """)
            
            # Create indexes for better query performance
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_conversations_started_at 
                ON conversations(started_at)
            """)
            
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_conversations_session_id 
                ON conversations(session_id)
            """)
            
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
                ON messages(conversation_id)
            """)
            
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
                ON messages(timestamp)
            """)
            
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_role 
                ON messages(role)
            """)
            
            conn.commit()
            print("Database tables initialized successfully")
            return True
    except Exception as e:
        conn.rollback()
        print(f"Error initializing database: {e}")
        return False
    finally:
        return_db_connection(conn)

def store_conversation(
    conversation_id: str,
    session_id: str,
    user_message: Dict[str, Any],
    assistant_message: Dict[str, Any],
    metadata: Dict[str, Any]
) -> bool:
    """Store conversation and messages in database."""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            # Check if conversation exists
            cur.execute(
                "SELECT conversation_id FROM conversations WHERE conversation_id = %s",
                (conversation_id,)
            )
            exists = cur.fetchone()
            
            if not exists:
                # Create new conversation
                cur.execute("""
                    INSERT INTO conversations 
                    (conversation_id, session_id, user_agent, ip_hash, referrer, 
                     device_type, language, first_message, message_count, started_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 2, NOW())
                """, (
                    conversation_id,
                    session_id,
                    metadata.get("user_agent", "unknown"),
                    metadata.get("ip_hash", "unknown"),
                    metadata.get("referrer", "unknown"),
                    metadata.get("device_type", "unknown"),
                    metadata.get("language", "unknown"),
                    user_message.get("content", "")[:500],  # Limit length
                    2
                ))
            else:
                # Update message count
                cur.execute("""
                    UPDATE conversations 
                    SET message_count = message_count + 2, updated_at = NOW()
                    WHERE conversation_id = %s
                """, (conversation_id,))
            
            # Insert user message
            cur.execute("""
                INSERT INTO messages 
                (message_id, conversation_id, role, content, timestamp)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (message_id) DO NOTHING
            """, (
                user_message.get("message_id"),
                conversation_id,
                "user",
                user_message.get("content", ""),
                user_message.get("timestamp", datetime.utcnow().isoformat())
            ))
            
            # Insert assistant message
            cur.execute("""
                INSERT INTO messages 
                (message_id, conversation_id, role, content, timestamp, model_used, tokens_used, response_time_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (message_id) DO NOTHING
            """, (
                assistant_message.get("message_id"),
                conversation_id,
                "assistant",
                assistant_message.get("content", ""),
                assistant_message.get("timestamp", datetime.utcnow().isoformat()),
                assistant_message.get("model_used"),
                assistant_message.get("tokens_used"),
                assistant_message.get("response_time_ms")
            ))
            
            conn.commit()
            return True
    except Exception as e:
        conn.rollback()
        print(f"Error storing conversation: {e}")
        return False
    finally:
        return_db_connection(conn)

