"""
Stage 1 — Step B: Preprocess all public datasets into SFT JSONL.

Design choices
──────────────
• No LLM calls — we use structured rule-based response TEMPLATES for Stage 1.
  This keeps cold-start cost near zero while teaching the model the output FORMAT
  and general scam pattern vocabulary.

• Stage 2 (Sonnet-distilled) provides the high-quality chain-of-thought reasoning;
  Stage 1 just builds broad coverage of fraud signal patterns.

• English inputs get a bilingual response (English analysis + Chinese summary)
  to bridge the language gap before Stage 2 Chinese fine-tuning.

• Heavy class imbalance is handled per-dataset:
  - Over-represented non-scam: subsampled to ≤ scam_count × OVERSAMPLE_RATIO
  - Credit card fraud (0.17% fraud): NOT included — feature-only, no text

Output:
  data/stage1_out/s1_unified.jsonl   — all samples in SFT messages format
  data/stage1_out/s1_train.jsonl
  data/stage1_out/s1_val.jsonl
"""

import json
import os
import random
import re
from pathlib import Path
from typing import Optional

from config import (
    PUBLIC_DATASETS, STAGE1_RAW_DIR, STAGE1_OUT_DIR,
    STAGE1_UNIFIED, STAGE1_TRAIN, STAGE1_VAL, SYSTEM_PROMPT,
)

random.seed(42)

# Non-scam samples kept at most OVERSAMPLE_RATIO × scam samples per dataset
OVERSAMPLE_RATIO = 2.0
MAX_TEXT_LEN = 2000            # truncate very long inputs
MAX_PER_DATASET = 20_000      # cap per dataset to avoid one source dominating


# ── Response templates ────────────────────────────────────────────────────────

def make_scam_response(source_tag: str, lang: str, input_text: str) -> str:
    """Generate a structured scam detection response without LLM."""
    scam_types = {
        "sms":          "簡訊詐騙 (SMS Scam / Smishing)",
        "url":          "釣魚網站 (Phishing URL)",
        "email":        "釣魚郵件 (Phishing Email)",
        "social_media": "社群媒體詐騙 (Social Media Scam)",
    }
    scam_type = scam_types.get(source_tag, "詐騙訊息")

    # Detect heuristic signals present in text
    signals = detect_signals(input_text, source_tag)

    if lang == "en":
        analysis = (
            f"This message contains multiple indicators of a {scam_type}.\n\n"
            f"Detected signals:\n"
            + "\n".join(f"- {s}" for s in signals) +
            "\n\n中文摘要：此訊息具有詐騙特徵，請勿點擊連結或提供個人資訊。"
        )
        action = "Do not click any links, do not provide personal information. Block the sender."
    else:
        analysis = (
            f"此訊息具有{scam_type}的特徵。\n\n"
            f"偵測到的可疑指標：\n"
            + "\n".join(f"- {s}" for s in signals)
        )
        action = "請勿點擊連結，不要提供個人資訊或匯款。封鎖並檢舉此訊息。"

    return (
        f"1. **判定結果**：詐騙\n"
        f"2. **風險等級**：高風險\n"
        f"3. **詐騙類型**：{scam_type}\n"
        f"4. **分析理由**：\n{analysis}\n"
        f"5. **建議行動**：{action}"
    )


def make_safe_response(source_tag: str, lang: str, input_text: str) -> str:
    """Generate a structured non-scam detection response without LLM."""
    source_names = {
        "sms":          "簡訊",
        "url":          "網址",
        "email":        "郵件",
        "social_media": "社群媒體貼文",
    }
    src_name = source_names.get(source_tag, "訊息")
    signals = detect_safe_signals(input_text, source_tag)

    if lang == "en":
        analysis = (
            f"This {source_tag} does not show signs of fraud.\n\n"
            f"Safety indicators:\n"
            + "\n".join(f"- {s}" for s in signals) +
            "\n\n中文摘要：此訊息未發現詐騙特徵，為正常內容。"
        )
        action = "No action needed. This appears to be a legitimate message."
    else:
        analysis = (
            f"此{src_name}未發現詐騙特徵。\n\n"
            f"安全指標：\n"
            + "\n".join(f"- {s}" for s in signals)
        )
        action = "無需特別處理，此為正常訊息。"

    return (
        f"1. **判定結果**：非詐騙\n"
        f"2. **風險等級**：低風險\n"
        f"3. **詐騙類型**：無\n"
        f"4. **分析理由**：\n{analysis}\n"
        f"5. **建議行動**：{action}"
    )


def detect_signals(text: str, source_tag: str) -> list[str]:
    """Heuristic signal extraction for scam content."""
    t = text.lower()
    signals = []

    # URL signals
    if source_tag == "url":
        if re.search(r'\.(top|xyz|sbs|tk|ml|cf|ga|gq|click|loan)($|/)', t):
            signals.append("Suspicious TLD (.top/.xyz/.sbs etc.) — commonly used in phishing")
        if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', t):
            signals.append("IP address used as domain — legitimate sites use domain names")
        if re.search(r'(secure|login|verify|account|update|confirm|banking|paypal|apple|google|microsoft)', t):
            signals.append("Brand-impersonation keyword in URL path")
        if re.search(r'(0ab|j5z|bit\.ly|tinyurl|lihi|maac\.io|csms\.tw|lihi\.cc)', t):
            signals.append("URL shortener detected — hides the actual destination")
        if len(re.findall(r'\.', t.split('/')[0])) > 3:
            signals.append("Excessive subdomains in hostname — common phishing pattern")
        if not signals:
            signals.append("URL structure deviates from legitimate domain conventions")

    # SMS / text signals
    elif source_tag in ("sms", "email"):
        if re.search(r'(免聯徵|不照會|快速撥款|當日核貸|秒批)', text):
            signals.append("Illegal loan keywords: 免聯徵/不照會/快速撥款")
        if re.search(r'(urgent|act now|limited time|verify immediately|account suspended)', t):
            signals.append("High-pressure urgency language to force immediate action")
        if re.search(r'(click here|press here|tap this link)', t):
            signals.append("Generic call-to-action hiding destination URL")
        if re.search(r'(free|winner|congratulations|selected|prize|reward)', t):
            signals.append("Prize/reward lure — classic social engineering")
        if re.search(r'(bank|account|password|ssn|social security|credit card)', t):
            signals.append("Soliciting sensitive financial/identity information")
        if re.search(r'(http|https|www)', t) and re.search(r'(bit\.ly|tinyurl|goo\.gl|0ab|j5z)', t):
            signals.append("Shortened URL in unsolicited message")
        if not signals:
            signals.append("Unsolicited message with suspicious characteristics")

    # Social media
    elif source_tag == "social_media":
        if re.search(r'(free|giveaway|giveaway|win|gift|prize)', t):
            signals.append("Fake giveaway lure targeting social media users")
        if re.search(r'(invest|profit|return|earn|passive income|roi)', t):
            signals.append("Investment fraud signals: unrealistic return promises")
        if re.search(r'(limited time|only \d+ left|hurry|expires)', t):
            signals.append("Artificial scarcity/urgency tactics")
        if re.search(r'(dm me|message me|whatsapp|telegram|line)', t):
            signals.append("Directing victim off-platform to avoid detection")
        if not signals:
            signals.append("Social media content with fraud indicators")

    return signals or ["Contains patterns commonly associated with fraudulent content"]


def detect_safe_signals(text: str, source_tag: str) -> list[str]:
    """Heuristic signal extraction for legitimate content."""
    t = text.lower()
    signals = []

    if source_tag == "url":
        if re.search(r'\.(gov|edu|org|com|net|tw|jp|kr|au|uk)($|/)', t):
            signals.append("Standard/trusted top-level domain")
        if re.search(r'(https://)', t):
            signals.append("HTTPS protocol — encrypted connection")
        if not re.search(r'(login|verify|account|update|secure)', t):
            signals.append("No brand-impersonation or urgency keywords in URL")
        signals.append("URL structure consistent with legitimate websites")
    elif source_tag in ("sms", "email"):
        signals.append("No unsolicited links or requests for sensitive information")
        signals.append("Communication style consistent with legitimate service notifications")
    elif source_tag == "social_media":
        signals.append("Content is informational without manipulation tactics")
        signals.append("No unrealistic promises or artificial urgency")

    return signals or ["No fraud indicators detected"]


# ── Dataset loaders ───────────────────────────────────────────────────────────

def build_user_message(text: str, source_tag: str, lang: str) -> str:
    source_names = {
        "sms":          ("簡訊", "SMS message"),
        "url":          ("網址", "URL"),
        "email":        ("郵件", "email"),
        "social_media": ("社群媒體貼文", "social media post"),
    }
    zh_name, en_name = source_names.get(source_tag, ("訊息", "message"))

    if lang == "zh":
        return f"請分析以下{zh_name}是否為詐騙，並提供完整的判斷理由：\n\n{text}"
    elif lang == "en":
        return (
            f"請分析以下{en_name}是否為詐騙，並提供完整的判斷理由：\n\n"
            f"[Content in English]\n{text}"
        )
    else:  # multilingual
        return f"請分析以下訊息是否為詐騙，並提供完整的判斷理由：\n\n{text}"


def to_sft_record(text: str, label: str, source_tag: str, lang: str,
                  dataset_id: str) -> Optional[dict]:
    """Convert a raw sample to SFT messages format."""
    text = str(text).strip()[:MAX_TEXT_LEN]
    if not text:
        return None

    is_scam = label == "scam"
    user_msg = build_user_message(text, source_tag, lang)
    assistant_msg = (
        make_scam_response(source_tag, lang, text)
        if is_scam
        else make_safe_response(source_tag, lang, text)
    )

    return {
        "messages": [
            {"role": "system",    "content": SYSTEM_PROMPT},
            {"role": "user",      "content": user_msg},
            {"role": "assistant", "content": assistant_msg},
        ],
        "metadata": {
            "dataset_id":  dataset_id,
            "source":      source_tag,
            "label":       label,
            "lang":        lang,
            "stage":       "1_cold_start",
        },
    }


def normalise_label(raw_label, scam_value) -> str:
    """Map dataset-specific label → 'scam' or 'not_scam'."""
    if isinstance(scam_value, int):
        try:
            return "scam" if int(raw_label) == scam_value else "not_scam"
        except (ValueError, TypeError):
            return "not_scam"
    return "scam" if str(raw_label).strip().lower() == str(scam_value).lower() else "not_scam"


def load_kaggle_dataset(ds_cfg: dict, raw_dir: Path) -> list[dict]:
    import csv

    ds_dir = raw_dir / ds_cfg["id"]
    schema = ds_cfg["schema"]
    source_tag = ds_cfg["source_tag"]
    lang = ds_cfg["lang"]
    records = []

    for fname in ds_cfg.get("files", []):
        fpath = ds_dir / fname
        if not fpath.exists():
            print(f"  ⚠️  File not found: {fpath} — skipped")
            continue

        with open(fpath, encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Handle multi-column input (e.g., job postings)
                if "input_cols" in schema:
                    parts = [str(row.get(c, "") or "").strip() for c in schema["input_cols"]]
                    text = "\n".join(p for p in parts if p)
                else:
                    text = str(row.get(schema["input_col"], "") or "").strip()

                raw_label = row.get(schema["label_col"], "")
                label = normalise_label(raw_label, schema["label_scam_value"])

                rec = to_sft_record(text, label, source_tag, lang, ds_cfg["id"])
                if rec:
                    records.append(rec)

    return records


def load_huggingface_dataset(ds_cfg: dict, raw_dir: Path) -> list[dict]:
    ds_dir = raw_dir / ds_cfg["id"]
    schema = ds_cfg["schema"]
    lang = ds_cfg["lang"]
    records = []

    for cfg in ds_cfg["configs"]:
        config_name = cfg["config"]
        split = cfg["split"]
        source_tag = cfg["source_tag"]

        jsonl_path = ds_dir / f"{config_name or 'default'}_{split}.jsonl"
        if not jsonl_path.exists():
            print(f"  ⚠️  Not downloaded: {jsonl_path.name} — skipped (run stage1_download_datasets.py first)")
            continue

        with open(jsonl_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue

                text = str(row.get(schema["input_col"], "") or "").strip()
                raw_label = row.get(schema["label_col"], "")
                label = normalise_label(raw_label, schema["label_scam_value"])

                rec = to_sft_record(text, label, source_tag, lang, ds_cfg["id"])
                if rec:
                    records.append(rec)

    return records


def load_hf_raw_dataset(ds_cfg: dict, raw_dir: Path) -> list[dict]:
    """Load datasets downloaded via huggingface_hub raw file download."""
    ds_dir = raw_dir / ds_cfg["id"]
    lang = ds_cfg["lang"]
    records = []

    for rf in ds_cfg["raw_files"]:
        filename = rf["file"]
        source_tag = rf["source_tag"]
        schema = rf["schema"]

        local_path = ds_dir / filename.replace("/", "_")
        if not local_path.exists():
            print(f"  ⚠️  Not downloaded: {local_path.name} — skipped")
            continue

        # Load JSON or JSONL
        rows = []
        with open(local_path, encoding="utf-8") as f:
            if filename.endswith(".json"):
                data = json.load(f)
                rows = data if isinstance(data, list) else [data]
            elif filename.endswith(".jsonl"):
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            rows.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue

        count = 0
        for row in rows:
            text = str(row.get(schema["input_col"], "") or "").strip()
            raw_label = row.get(schema["label_col"], "")
            label = normalise_label(raw_label, schema["label_scam_value"])

            rec = to_sft_record(text, label, source_tag, lang, ds_cfg["id"])
            if rec:
                records.append(rec)
                count += 1

        print(f"    {local_path.name}: {count} records")

    return records


# ── Balance + split ───────────────────────────────────────────────────────────

def balance_dataset(records: list[dict]) -> list[dict]:
    """Subsample to balance labels and cap total per dataset."""
    scam = [r for r in records if r["metadata"]["label"] == "scam"]
    non_scam = [r for r in records if r["metadata"]["label"] == "not_scam"]

    # Balance: cap non-scam at OVERSAMPLE_RATIO × scam
    max_non_scam = int(len(scam) * OVERSAMPLE_RATIO)
    if len(non_scam) > max_non_scam:
        non_scam = random.sample(non_scam, max_non_scam)

    combined = scam + non_scam

    # Global cap per dataset so no single source dominates
    if len(combined) > MAX_PER_DATASET:
        combined = random.sample(combined, MAX_PER_DATASET)

    return combined


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    raw_dir = Path(STAGE1_RAW_DIR)
    os.makedirs(STAGE1_OUT_DIR, exist_ok=True)

    all_records = []
    stats = {}

    for ds_cfg in PUBLIC_DATASETS:
        ds_id = ds_cfg["id"]
        dtype = ds_cfg["type"]
        print(f"\n[{ds_id}] Loading {ds_cfg['name']}...")

        if dtype == "kaggle":
            recs = load_kaggle_dataset(ds_cfg, raw_dir)
        elif dtype == "huggingface":
            recs = load_huggingface_dataset(ds_cfg, raw_dir)
        elif dtype == "hf_raw":
            recs = load_hf_raw_dataset(ds_cfg, raw_dir)
        else:
            print(f"  ⚠️  Skipping unknown type: {ds_id}")
            continue

        # Balance per dataset
        recs = balance_dataset(recs)
        n_scam = sum(1 for r in recs if r["metadata"]["label"] == "scam")
        n_safe = len(recs) - n_scam
        print(f"  → {len(recs)} samples (scam={n_scam}, not_scam={n_safe})")
        stats[ds_id] = {"scam": n_scam, "not_scam": n_safe, "total": len(recs)}
        all_records.extend(recs)

    if not all_records:
        print("\n⚠️  No records loaded. Run stage1_download_datasets.py first.")
        return

    # Global shuffle
    random.shuffle(all_records)

    # Write unified
    with open(STAGE1_UNIFIED, "w", encoding="utf-8") as f:
        for r in all_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # Train / val split (90 / 10)
    split = int(len(all_records) * 0.9)
    train, val = all_records[:split], all_records[split:]

    with open(STAGE1_TRAIN, "w", encoding="utf-8") as f:
        for r in train:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(STAGE1_VAL, "w", encoding="utf-8") as f:
        for r in val:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # Summary
    print(f"\n{'='*55}")
    print(f"Stage 1 preprocessing complete")
    print(f"{'='*55}")
    for ds_id, s in stats.items():
        print(f"  {ds_id:25s}  scam={s['scam']:6d}  not_scam={s['not_scam']:6d}")
    total_scam = sum(s["scam"] for s in stats.values())
    total_safe = sum(s["not_scam"] for s in stats.values())
    print(f"  {'TOTAL':25s}  scam={total_scam:6d}  not_scam={total_safe:6d}")
    print(f"\n  Train : {len(train):6d}  →  {STAGE1_TRAIN}")
    print(f"  Val   : {len(val):6d}  →  {STAGE1_VAL}")


if __name__ == "__main__":
    main()
