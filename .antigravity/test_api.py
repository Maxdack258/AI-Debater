import sys
import os

# add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.debater import call_openrouter

def test_api():
    print("Testing OpenRouter API with Clarifai Provider...")
    response = call_openrouter("You are a helpful assistant.", "Hello, are you receiving this?")
    print("Response:", response)

if __name__ == "__main__":
    test_api()
