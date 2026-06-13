"""Quick OpenRouter connectivity test."""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

from app.services.llm_client import stream_chat_completion, chat_completion

async def main():
    print("Testing OpenRouter connectivity...\n")

    # Test 1: streaming
    print("1. Streaming test (should print tokens):")
    messages = [{"role": "user", "content": "Say 'Hello from Jyotir!' in exactly 5 words."}]
    try:
        tokens = []
        async for t in stream_chat_completion(messages, max_tokens=50):
            print(t, end="", flush=True)
            tokens.append(t)
        print(f"\n   OK — {len(tokens)} tokens")
    except Exception as e:
        print(f"\n   FAIL: {e}")

    # Test 2: non-streaming
    print("\n2. Non-streaming test:")
    try:
        result = await chat_completion(messages, max_tokens=50)
        print(f"   Response: {result[:100]}")
        print(f"   OK")
    except Exception as e:
        print(f"   FAIL: {e}")

asyncio.run(main())
