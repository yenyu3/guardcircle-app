"""
Convert scam SFT data to individual TXT files for Bedrock Knowledge Base.

Each file = one scam case with full analysis, optimized for retrieval.

Usage:
    cd ai/sft_pipeline
    conda run -n guardcircle python prepare_kb_data.py
    # Then upload to S3:
    # aws s3 sync ./data/kb_docs s3://YOUR-BUCKET/guardcircle-kb/
"""

import json
import os

INPUT_FILE = "./data/stage2_out/s2_02_scam_sft.jsonl"
OUTPUT_DIR = "./data/kb_docs"

SOURCE_LABELS = {
    "sms": "簡訊",
    "url": "網址",
    "social_media": "社群媒體貼文",
    "email": "電子郵件",
}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    records = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))

    print(f"Loaded {len(records)} records from {INPUT_FILE}")

    for i, rec in enumerate(records):
        source_label = SOURCE_LABELS.get(rec["source"], rec["source"])
        content = rec["input_text"]
        analysis = rec.get("assistant_response", "")

        doc = f"""類型：{source_label}

{content}
"""

        filename = f"scam_{i+1:03d}_{rec['source']}.txt"
        with open(os.path.join(OUTPUT_DIR, filename), "w", encoding="utf-8") as f:
            f.write(doc)

    print(f"Generated {len(records)} files in {OUTPUT_DIR}/")
    print(f"\nNext steps:")
    print(f"  1. aws s3 sync {OUTPUT_DIR} s3://YOUR-BUCKET/guardcircle-kb/")
    print(f"  2. AWS Console → Bedrock → Knowledge bases → Create")
    print(f"  3. Data source → S3 → s3://YOUR-BUCKET/guardcircle-kb/")


if __name__ == "__main__":
    main()
