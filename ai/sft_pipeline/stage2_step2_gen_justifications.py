"""
Step 2: Use Bedrock Claude Sonnet to generate scam analysis justifications
for each scam sample. This is the "teacher" output we will distill into Qwen3.

Input:  01_raw_scam_data.jsonl
Output: 02_scam_with_justification.jsonl
"""

import json
import os
import time
import boto3
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import (
    BEDROCK_REGION, BEDROCK_SONNET_MODEL_ID,
    S2_RAW_SCAM as RAW_SCAM_JSON,
    S2_SCAM_SFT as SCAM_WITH_JUSTIFICATION,
    STAGE2_OUT_DIR as OUTPUT_DIR,
    SYSTEM_PROMPT, MAX_CONCURRENT_REQUESTS,
)


def create_bedrock_client():
    return boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)


SOURCE_LABEL = {
    "sms": "簡訊",
    "url": "網址",
    "social_media": "社群媒體貼文",
}


def build_prompt(record: dict) -> str:
    source_name = SOURCE_LABEL.get(record["source"], "訊息")
    return f"請分析以下{source_name}是否為詐騙，並提供完整的判斷理由：\n\n{record['input_text']}"


def call_sonnet(client, record: dict) -> dict:
    """Call Bedrock Sonnet to generate a justification for one scam sample."""
    user_msg = build_prompt(record)

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.3,
    })

    response = client.invoke_model(
        modelId=BEDROCK_SONNET_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=body,
    )

    result = json.loads(response["body"].read())
    assistant_text = result["content"][0]["text"]

    return {
        **record,
        "user_message": user_msg,
        "assistant_response": assistant_text,
    }


def process_record(client, record: dict, idx: int, total: int) -> dict | None:
    """Process a single record with retry logic."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            result = call_sonnet(client, record)
            print(f"  [{idx+1}/{total}] ✅ {record['source']}: {record['input_text'][:50]}...")
            return result
        except Exception as e:
            if "ThrottlingException" in str(type(e).__name__) or "throttl" in str(e).lower():
                wait = 2 ** (attempt + 1)
                print(f"  [{idx+1}/{total}] ⏳ Throttled, retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"  [{idx+1}/{total}] ❌ Error: {e}")
                if attempt == max_retries - 1:
                    return None
                time.sleep(1)
    return None


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load raw scam data
    records = []
    with open(RAW_SCAM_JSON, "r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))
    print(f"📖 Loaded {len(records)} scam records")

    # Check for existing progress (resume support)
    completed_inputs = set()
    if os.path.exists(SCAM_WITH_JUSTIFICATION):
        with open(SCAM_WITH_JUSTIFICATION, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                completed_inputs.add(obj["input_text"])
        print(f"📋 Resuming: {len(completed_inputs)} already completed")

    remaining = [r for r in records if r["input_text"] not in completed_inputs]
    print(f"🚀 Processing {len(remaining)} remaining records...")

    client = create_bedrock_client()

    with open(SCAM_WITH_JUSTIFICATION, "a", encoding="utf-8") as f:
        with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_REQUESTS) as executor:
            futures = {
                executor.submit(process_record, client, rec, i, len(remaining)): rec
                for i, rec in enumerate(remaining)
            }
            for future in as_completed(futures):
                result = future.result()
                if result:
                    f.write(json.dumps(result, ensure_ascii=False) + "\n")
                    f.flush()

    # Final count
    count = 0
    with open(SCAM_WITH_JUSTIFICATION, "r", encoding="utf-8") as f:
        for _ in f:
            count += 1
    print(f"\n✅ Done! {count} records with justifications saved to {SCAM_WITH_JUSTIFICATION}")


if __name__ == "__main__":
    main()
