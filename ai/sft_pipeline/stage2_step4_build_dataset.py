"""
Step 4: Combine scam + non-scam data into Qwen3 chat-format SFT dataset.

Qwen3 uses ChatML format:
<|im_start|>system
{system_prompt}<|im_end|>
<|im_start|>user
{user_message}<|im_end|>
<|im_start|>assistant
{assistant_response}<|im_end|>

We output two formats:
1. ChatML text format (for reference / compatibility)
2. Messages JSON format (for HuggingFace SFTTrainer / TRL)

Output: 04_sft_dataset.jsonl, 05_sft_train.jsonl, 06_sft_val.jsonl
"""

import json
import os
import random
from config import (
    STAGE2_OUT_DIR as OUTPUT_DIR,
    S2_SCAM_SFT as SCAM_WITH_JUSTIFICATION,
    S2_NONSCAM_SFT as NON_SCAM_DATA,
    STAGE2_TRAIN as SFT_TRAIN,
    STAGE2_VAL as SFT_VAL,
    SYSTEM_PROMPT,
)

SFT_DATASET = f"{OUTPUT_DIR}/s2_dataset.jsonl"


def load_jsonl(filepath: str) -> list[dict]:
    records = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def to_sft_record(record: dict) -> dict | None:
    """Convert a record to SFT messages format."""
    user_msg = record.get("user_message")
    assistant_msg = record.get("assistant_response")

    if not user_msg or not assistant_msg:
        return None

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": assistant_msg},
        ],
        # Metadata for analysis (won't be used in training)
        "metadata": {
            "source": record.get("source", "unknown"),
            "label": record.get("label", "unknown"),
        },
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    random.seed(42)

    # Load data
    scam_records = load_jsonl(SCAM_WITH_JUSTIFICATION)
    non_scam_records = load_jsonl(NON_SCAM_DATA)

    print(f"📖 Loaded scam records: {len(scam_records)}")
    print(f"📖 Loaded non-scam records: {len(non_scam_records)}")

    # Convert to SFT format
    all_sft = []
    skipped = 0

    for rec in scam_records + non_scam_records:
        sft = to_sft_record(rec)
        if sft:
            all_sft.append(sft)
        else:
            skipped += 1

    print(f"✅ Converted {len(all_sft)} records ({skipped} skipped due to missing fields)")

    # Shuffle
    random.shuffle(all_sft)

    # Write full dataset
    with open(SFT_DATASET, "w", encoding="utf-8") as f:
        for rec in all_sft:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # Train/Val split (90/10)
    split_idx = int(len(all_sft) * 0.9)
    train_data = all_sft[:split_idx]
    val_data = all_sft[split_idx:]

    with open(SFT_TRAIN, "w", encoding="utf-8") as f:
        for rec in train_data:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    with open(SFT_VAL, "w", encoding="utf-8") as f:
        for rec in val_data:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # Stats
    labels = {"scam": 0, "not_scam": 0}
    sources = {}
    for rec in all_sft:
        label = rec["metadata"]["label"]
        source = rec["metadata"]["source"]
        labels[label] = labels.get(label, 0) + 1
        sources[source] = sources.get(source, 0) + 1

    print(f"\n📊 Dataset Statistics:")
    print(f"   Total: {len(all_sft)}")
    print(f"   Train: {len(train_data)}, Val: {len(val_data)}")
    print(f"   Labels: {labels}")
    print(f"   Sources: {sources}")
    print(f"\n   Output files:")
    print(f"   - {SFT_DATASET}")
    print(f"   - {SFT_TRAIN}")
    print(f"   - {SFT_VAL}")


if __name__ == "__main__":
    main()
