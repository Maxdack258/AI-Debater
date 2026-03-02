import requests
import json
import os
import time
from database import save_debate, update_user_stats

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
MODEL = "gpt-oss-120b"

def call_openrouter(system_prompt: str, user_prompt: str) -> tuple[str, int]:
    """Call OpenRouter API with retry"""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL,
        "provider": { "order": ["Clarifai"] },
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
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
                print(f"OpenRouter Error: {response.status_code} - {response.text}")
                time.sleep(2)
        except Exception as e:
            print(f"Request Exception: {e}")
            time.sleep(2)
    return "Error: Could not generate response.", 0

def get_persona_prompt(persona: str, topic: str) -> str:
    """Stronger persona prompts for balanced debates"""
    prompts = {
        "Left-wing": f"""You are a passionate, well-informed Left-wing debater. The topic is: '{topic}'.
You strongly advocate for progressive policies, social justice, government intervention, collective welfare, and equality.
Use specific facts, statistics, historical examples, and moral arguments. Be assertive and confident.
Directly counter opposing arguments. Keep response under 150 words. Never break character.""",

        "Centrist/Neutral": f"""You are a pragmatic Centrist debater. The topic is: '{topic}'.
You advocate for balanced, evidence-based solutions that combine the best ideas from both sides.
Use nuanced analysis, data, and practical compromise. Acknowledge merit in other positions but explain why moderation works best.
Keep response under 150 words. Never break character.""",

        "Right-wing": f"""You are a passionate, well-informed Right-wing debater. The topic is: '{topic}'.
You strongly advocate for individual liberty, free markets, limited government, traditional values, and personal responsibility.
Use specific facts, statistics, historical examples, and principled arguments. Be assertive and confident.
Directly counter opposing arguments. Keep response under 150 words. Never break character."""
    }
    return prompts.get(persona, prompts["Centrist/Neutral"])

def get_judge_prompt(topic: str) -> str:
    """Unbiased judge prompt"""
    return f"""You are a strict debate judge evaluating argument quality ONLY. The topic is '{topic}'.

RULES:
- Judge ONLY on: logical strength, evidence quality, persuasiveness, and counter-argument effectiveness
- A moderate/centrist argument is NOT inherently better than a Left or Right one
- A passionate, well-evidenced argument from any side should beat a vague, unfocused one
- You MUST give each position a fair chance — do NOT default to Neutral/Centrist
- If Left or Right makes the strongest case with facts and logic, pick them

Return the winner as exactly 'Left', 'Neutral', or 'Right' at the very start of your response, followed by a one-sentence justification."""

def update_debate_file(debate_id: str, data: dict):
    """Write debate state to JSON file"""
    debate_file = f"debates_{debate_id}.json"
    with open(debate_file, "w") as f:
        json.dump(data, f, indent=2)

def start_debate_workflow(topic: str, debate_id: str, user_id: int = None):
    """Run the 10-round debate"""
    debate_file = f"debates_{debate_id}.json"
    
    with open(debate_file, "r") as f:
        debate_data = json.load(f)
        
    previous_round_summary = "This is the first round. Introduce your main points."
    
    for round_num in range(1, 11):
        print(f"Starting Round {round_num}")
        round_data = {"round_num": round_num, "responses": {}}
        round_tokens = 0
        
        # LEFT
        left_prompt = f"Previous context: {previous_round_summary}\n\nPresent your Left-wing argument."
        left_resp, t1 = call_openrouter(get_persona_prompt("Left-wing", topic), left_prompt)
        round_data["responses"]["Left"] = left_resp
        round_tokens += t1
        
        # NEUTRAL
        neutral_prompt = f"Previous context: {previous_round_summary}\nLeft just argued: {left_resp}\n\nPresent your Centrist/Neutral argument."
        neutral_resp, t2 = call_openrouter(get_persona_prompt("Centrist/Neutral", topic), neutral_prompt)
        round_data["responses"]["Neutral"] = neutral_resp
        round_tokens += t2
        
        # RIGHT
        right_prompt = f"Previous context: {previous_round_summary}\nLeft argued: {left_resp}\nNeutral argued: {neutral_resp}\n\nPresent your Right-wing argument."
        right_resp, t3 = call_openrouter(get_persona_prompt("Right-wing", topic), right_prompt)
        round_data["responses"]["Right"] = right_resp
        round_tokens += t3
        
        # JUDGE
        judge_context = f"Round {round_num} arguments:\nLeft: {left_resp}\nNeutral: {neutral_resp}\nRight: {right_resp}"
        judge_prompt = f"{judge_context}\n\nWho won this round? Explain briefly."
        judge_resp, t4 = call_openrouter(get_judge_prompt(topic), judge_prompt)
        round_data["judge_decision"] = judge_resp
        round_tokens += t4
        
        # Extract winner
        winner = "Tie"
        first_word = judge_resp.strip().split()[0] if judge_resp.strip() else ""
        if first_word.startswith("Left"): winner = "Left"
        elif first_word.startswith("Right"): winner = "Right"
        elif first_word.startswith("Neutral"): winner = "Neutral"
        round_data["winner"] = winner
        
        # Context for next round
        previous_round_summary = f"In round {round_num}, {winner} won. Arguments:\nLeft: {left_resp}\nNeutral: {neutral_resp}\nRight: {right_resp}"
        
        debate_data["rounds"].append(round_data)
        update_debate_file(debate_id, debate_data)

        # Save to DB periodically
        if user_id:
            save_debate(debate_id, user_id, topic, debate_data, "running")
            update_user_stats(user_id, round_tokens)
        
    debate_data["status"] = "completed"
    update_debate_file(debate_id, debate_data)

    # Final save to DB
    if user_id:
        save_debate(debate_id, user_id, topic, debate_data, "completed")

    # Clean up temp file
    try:
        os.remove(debate_file)
    except:
        pass

    print("Debate Finished")
