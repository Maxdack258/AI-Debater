import sys
import os

# add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.debater import start_debate_workflow
import json
import uuid

def test_debate():
    print("Testing Debate Workflow...")
    debate_id = "test_run_123"
    
    # Init file
    with open(f"backend/debates_{debate_id}.json", "w") as f:
        json.dump({"id": debate_id, "topic": "Is AI replacing human creativity?", "status": "running", "rounds": []}, f)
        
    start_debate_workflow("Is AI replacing human creativity?", debate_id)

if __name__ == "__main__":
    test_debate()
