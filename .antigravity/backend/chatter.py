import requests
import json
import os
import time
from database import save_chat, update_user_stats

# Model config
MODEL = "gpt-oss-120b"
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

def call_chat_model(history: list) -> tuple:
    """Call OpenRouter API with a message history"""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL,
        "provider": { "order": ["Clarifai"] },
        "messages": history
    }
    
    for _ in range(3):
        try:
            response = requests.post(url, headers=headers, json=data, timeout=60)
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                tokens = result.get("usage", {}).get("total_tokens", 0)
                return content, tokens
            else:
                print(f"Chat Error: {response.status_code} - {response.text}")
                time.sleep(2)
        except Exception as e:
            print(f"Request Exception: {e}")
            time.sleep(2)
    return "Error: Could not generate response.", 0

def chat_workflow(chat_id: str, user_id: int, user_message: str):
    from database import get_chat_by_id
    chat_data = get_chat_by_id(chat_id)
    if not chat_data:
        return
        
    history = chat_data["history"]
    
    # Append user message
    history.append({"role": "user", "content": user_message})
    save_chat(chat_id, user_id, chat_data["topic"], history, "running")
    
    # Prepend dynamic system message to history for the API call
    system_prompt = {"role": "system", "content": "You are a helpful and normal AI assistant. Keep responses helpful and engaging."}
    api_history = [system_prompt] + history
    
    resp_content, tokens_used = call_chat_model(api_history)
    
    # Append AI message
    history.append({"role": "assistant", "content": resp_content})
    save_chat(chat_id, user_id, chat_data["topic"], history, "running")
    
    # Update Stats
    update_user_stats(user_id, tokens_used)
