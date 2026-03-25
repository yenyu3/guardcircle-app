"""
Step 3: Generate 300 non-scam (legitimate) samples using Bedrock Sonnet.

Categories of legitimate content:
- 正常簡訊 (normal SMS): bank notifications, delivery updates, OTP codes, friend messages
- 正常網址 (normal URLs): government sites, bank sites, e-commerce
- 正常社群貼文 (normal social media): real product ads, news, personal posts

Each batch asks Sonnet to generate samples, then we also ask Sonnet to produce
the "non-scam" justification (so the model learns to correctly identify safe content).

Output: 03_non_scam_data.jsonl
"""

import json
import os
import time
import boto3
from config import (
    BEDROCK_REGION, BEDROCK_SONNET_MODEL_ID,
    STAGE2_OUT_DIR as OUTPUT_DIR,
    S2_NONSCAM_SFT as NON_SCAM_DATA,
    SYSTEM_PROMPT, NON_SCAM_COUNT, BATCH_SIZE,
)


def create_bedrock_client():
    return boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)


# Define categories and their distribution
CATEGORIES = [
    {
        "source": "sms",
        "count": 100,
        "description": "台灣常見的正常簡訊",
        "examples": [
            "銀行交易通知（餘額、轉帳成功）",
            "快遞物流通知（包裹已送達、預計配送時間）",
            "OTP 驗證碼",
            "電信帳單通知",
            "醫院掛號提醒",
            "信用卡消費通知",
            "朋友之間的一般對話訊息",
            "公司內部通知",
            "政府機關通知（繳稅、罰單）",
            "學校通知",
        ],
    },
    {
        "source": "url",
        "count": 100,
        "description": "台灣常見的正常合法網址",
        "examples": [
            "政府網站（gov.tw）",
            "銀行官方網站（ctbcbank.com, esunbank.com.tw）",
            "電商平台（shopee.tw, momo.com, pchome.com.tw）",
            "新聞網站（udn.com, ltn.com.tw）",
            "社群平台（facebook.com, instagram.com）",
            "企業官網",
            "學校網站（edu.tw）",
            "醫療機構（hospital.org.tw）",
            "交通運輸（thsrc.com.tw, railway.gov.tw）",
            "串流平台（netflix.com, spotify.com）",
        ],
    },
    {
        "source": "social_media",
        "count": 100,
        "description": "台灣常見的正常社群媒體廣告或貼文",
        "examples": [
            "品牌官方促銷（合理折扣、知名品牌）",
            "餐廳美食推薦",
            "旅遊行程分享",
            "科技產品開箱評測",
            "健身運動分享",
            "教育課程推廣（正規機構）",
            "藝文活動宣傳",
            "公益活動",
            "個人生活分享",
            "新聞媒體內容轉發",
        ],
    },
]


def generate_batch(client, category: dict, batch_num: int, batch_size: int) -> list[dict]:
    """Generate a batch of non-scam samples for a given category."""
    prompt = f"""請生成 {batch_size} 筆「真實且合理」的台灣{category['description']}內容。

類型參考：
{chr(10).join(f'- {ex}' for ex in category['examples'])}

要求：
1. 每筆內容必須是完全合法、正常的，不包含任何詐騙元素
2. 內容要真實自然，像是真正會收到/看到的訊息
3. 包含適當的中文（繁體）內容
4. 多樣化：不要重複相同模式，每筆都要不同類型
5. {"對於網址類型，請生成完整的 URL（不需要是真實存在的，但格式和域名要合理）" if category['source'] == 'url' else "內容長度要自然，簡訊短一些，社群貼文可以長一些"}

請以 JSON array 格式回覆，每個元素包含一個 "text" 欄位：
[
  {{"text": "內容1"}},
  {{"text": "內容2"}},
  ...
]

只回覆 JSON，不要有其他文字。這是第 {batch_num + 1} 批，請確保內容不重複。"""

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.9,
    })

    response = client.invoke_model(
        modelId=BEDROCK_SONNET_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=body,
    )

    result = json.loads(response["body"].read())
    text = result["content"][0]["text"]

    # Parse JSON from response (handle markdown code blocks)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]  # remove first line
        text = text.rsplit("```", 1)[0]  # remove last ```

    samples = json.loads(text)
    return [
        {
            "source": category["source"],
            "input_text": s["text"],
            "label": "not_scam",
        }
        for s in samples
        if s.get("text")
    ]


def generate_justification(client, record: dict) -> dict:
    """Generate a non-scam justification using Sonnet."""
    source_label = {"sms": "簡訊", "url": "網址", "social_media": "社群媒體貼文"}
    source_name = source_label.get(record["source"], "訊息")
    user_msg = f"請分析以下{source_name}是否為詐騙，並提供完整的判斷理由：\n\n{record['input_text']}"

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_msg}],
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


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    client = create_bedrock_client()

    # Check existing progress
    existing = []
    if os.path.exists(NON_SCAM_DATA):
        with open(NON_SCAM_DATA, "r", encoding="utf-8") as f:
            for line in f:
                existing.append(json.loads(line))
        print(f"📋 Found {len(existing)} existing non-scam records")

    existing_by_source = {}
    for r in existing:
        existing_by_source.setdefault(r["source"], []).append(r)

    all_records = list(existing)

    # Phase 1: Generate non-scam text content
    print("=" * 50)
    print("Phase 1: Generating non-scam content")
    print("=" * 50)

    for category in CATEGORIES:
        source = category["source"]
        existing_count = len(existing_by_source.get(source, []))
        needed = category["count"] - existing_count

        if needed <= 0:
            print(f"  ✅ {source}: already have {existing_count}/{category['count']}")
            continue

        print(f"  🔄 {source}: generating {needed} more (have {existing_count}/{category['count']})")
        num_batches = (needed + BATCH_SIZE - 1) // BATCH_SIZE
        generated = 0

        for batch_num in range(num_batches):
            remaining = min(BATCH_SIZE, needed - generated)
            try:
                samples = generate_batch(client, category, batch_num, remaining)
                all_records.extend(samples)
                generated += len(samples)
                print(f"    Batch {batch_num+1}/{num_batches}: +{len(samples)} samples")
                time.sleep(0.5)  # rate limiting
            except Exception as e:
                print(f"    ❌ Batch {batch_num+1} failed: {e}")
                time.sleep(2)

    # Save intermediate (content only, before justifications)
    print(f"\n📝 Total non-scam samples: {len(all_records)}")

    # Phase 2: Generate justifications for samples that don't have them
    print("=" * 50)
    print("Phase 2: Generating justifications")
    print("=" * 50)

    needs_justification = [r for r in all_records if "assistant_response" not in r]
    has_justification = [r for r in all_records if "assistant_response" in r]

    print(f"  {len(has_justification)} already have justifications")
    print(f"  {len(needs_justification)} need justifications")

    completed = list(has_justification)

    for i, record in enumerate(needs_justification):
        try:
            result = generate_justification(client, record)
            completed.append(result)
            print(f"  [{i+1}/{len(needs_justification)}] ✅ {record['source']}: {record['input_text'][:40]}...")
            time.sleep(0.3)
        except Exception as e:
            print(f"  [{i+1}/{len(needs_justification)}] ❌ Error: {e}")
            # Save without justification, can retry later
            completed.append(record)
            time.sleep(1)

    # Write final output
    with open(NON_SCAM_DATA, "w", encoding="utf-8") as f:
        for rec in completed:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"\n✅ Done! {len(completed)} non-scam records saved to {NON_SCAM_DATA}")


if __name__ == "__main__":
    main()
