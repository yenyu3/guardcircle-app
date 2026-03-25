"""
Pipeline configuration — Two-stage SFT for GuardCircle scam detector.

Stage 1 — Cold Start:
  Large public English datasets (Kaggle + HuggingFace).
  Teaches the model broad scam/fraud patterns.
  Uses rule-based response templates (no LLM cost).

Stage 2 — Domain SFT:
  Competition datasets (TW Chinese) + Sonnet-distilled justifications.
  Fine-tunes the model on Taiwan-specific fraud patterns.
  Uses Bedrock Sonnet to generate rich chain-of-thought justifications.
"""

# ── AWS / Bedrock ─────────────────────────────────────────────────────────────
BEDROCK_REGION = "us-east-1"
BEDROCK_SONNET_MODEL_ID = "anthropic.claude-sonnet-4-20250514"
MAX_CONCURRENT_REQUESTS = 5

# ── Directory layout ──────────────────────────────────────────────────────────
STAGE1_RAW_DIR   = "./data/stage1_raw"    # downloaded public datasets
STAGE1_OUT_DIR   = "./data/stage1_out"    # processed stage-1 JSONL files
STAGE2_RAW_DIR   = "../詐騙資料集"         # competition xlsx files
STAGE2_OUT_DIR   = "./data/stage2_out"    # processed stage-2 JSONL files

# Stage 1 output files
STAGE1_UNIFIED   = f"{STAGE1_OUT_DIR}/s1_unified.jsonl"      # all public data, normalised
STAGE1_TRAIN     = f"{STAGE1_OUT_DIR}/s1_train.jsonl"
STAGE1_VAL       = f"{STAGE1_OUT_DIR}/s1_val.jsonl"

# Stage 2 intermediate files
S2_RAW_SCAM      = f"{STAGE2_OUT_DIR}/s2_01_raw_scam.jsonl"
S2_SCAM_SFT      = f"{STAGE2_OUT_DIR}/s2_02_scam_sft.jsonl"   # with Sonnet justification
S2_NONSCAM_SFT   = f"{STAGE2_OUT_DIR}/s2_03_nonscam_sft.jsonl"
STAGE2_TRAIN     = f"{STAGE2_OUT_DIR}/s2_train.jsonl"
STAGE2_VAL       = f"{STAGE2_OUT_DIR}/s2_val.jsonl"

# Competition dataset files
SMS_URL_FILE     = "20260302_SMS & URL Scam dataset.xlsx"
SOCIAL_FILE      = "Social Media Scam Dataset.xlsx"

# ── Stage 2 generation settings ───────────────────────────────────────────────
NON_SCAM_COUNT   = 300   # non-scam samples to generate via LLM
BATCH_SIZE       = 10    # samples per Bedrock call

# ── Public dataset registry ───────────────────────────────────────────────────
# Each entry describes one source dataset.
# 'type': how it is downloaded ('kaggle', 'huggingface', 'manual')
# 'schema': column mapping after loading → {input_col, label_col, label_scam_value}
PUBLIC_DATASETS = [
    # ══════════════════════════════════════════════════════════════════════════
    # HuggingFace — datasets library (verified working with datasets>=4.8)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id":        "sms_spam",
        "name":      "SMS Spam Collection (5,574 EN SMS)",
        "type":      "huggingface",
        "handle":    "sms_spam",      # built-in HF dataset
        "configs":   [{"config": None, "source_tag": "sms", "split": "train"}],
        "lang":      "en",
        "schema": {
            "input_col":        "sms",
            "label_col":        "label",   # 0=ham, 1=spam
            "label_scam_value": 1,
        },
    },
    {
        "id":        "phishing_url",
        "name":      "Phishing URL Detection (7,658 URLs + features)",
        "type":      "huggingface",
        "handle":    "pirocheto/phishing-url",
        "configs":   [{"config": None, "source_tag": "url", "split": "train"}],
        "lang":      "en",
        "schema": {
            "input_col":        "url",
            "label_col":        "status",   # 'phishing' or 'legitimate'
            "label_scam_value": "phishing",
        },
    },
    {
        "id":        "phishing_site",
        "name":      "Phishing Site Classification (2,100 URLs)",
        "type":      "huggingface",
        "handle":    "shawhin/phishing-site-classification",
        "configs":   [{"config": None, "source_tag": "url", "split": "train"}],
        "lang":      "en",
        "schema": {
            "input_col":        "text",
            "label_col":        "labels",   # 0=legit, 1=phishing
            "label_scam_value": 1,
        },
    },
    # ══════════════════════════════════════════════════════════════════════════
    # HuggingFace — raw file download (script-based repos, can't use datasets lib)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id":        "hf_phishing_raw",
        "name":      "ealvaradob/phishing-dataset (SMS + URLs, raw JSON)",
        "type":      "hf_raw",
        "handle":    "ealvaradob/phishing-dataset",
        "raw_files": [
            # texts.json: SMS phishing texts
            {"file": "texts.json", "source_tag": "sms",
             "schema": {"input_col": "text", "label_col": "label", "label_scam_value": 1}},
            # urls.json: phishing URLs
            {"file": "urls.json", "source_tag": "url",
             "schema": {"input_col": "text", "label_col": "label", "label_scam_value": 1}},
        ],
        "lang":      "en",
    },
    {
        "id":        "hf_difraud",
        "name":      "difraud/difraud — DIFrauD (7 fraud domains, JSONL)",
        "type":      "hf_raw",
        "handle":    "difraud/difraud",
        "raw_files": [
            {"file": "phishing/train.jsonl",          "source_tag": "email",
             "schema": {"input_col": "text", "label_col": "label", "label_scam_value": 1}},
            {"file": "sms/train.jsonl",                "source_tag": "sms",
             "schema": {"input_col": "text", "label_col": "label", "label_scam_value": 1}},
            {"file": "product_reviews/train.jsonl",    "source_tag": "social_media",
             "schema": {"input_col": "text", "label_col": "label", "label_scam_value": 1}},
            {"file": "job_scams/train.jsonl",          "source_tag": "social_media",
             "schema": {"input_col": "text", "label_col": "label", "label_scam_value": 1}},
        ],
        "lang":      "en",
    },
    # ══════════════════════════════════════════════════════════════════════════
    # Kaggle — requires kaggle CLI + API key (~/.kaggle/kaggle.json)
    # ══════════════════════════════════════════════════════════════════════════
    {
        "id":        "kaggle_web_phishing",
        "name":      "Web Page Phishing Detection (11,430 URLs, Kaggle)",
        "type":      "kaggle",
        "handle":    "shashwatwork/web-page-phishing-detection-dataset",
        "files":     ["dataset_phishing.csv"],
        "source_tag": "url",
        "lang":      "en",
        "schema": {
            "input_col":         "url",
            "label_col":         "status",    # 'phishing' or 'legitimate'
            "label_scam_value":  "phishing",
        },
    },
    {
        "id":        "kaggle_job_fraud",
        "name":      "Real/Fake Job Posting (17,880, Kaggle)",
        "type":      "kaggle",
        "handle":    "shivamb/real-or-fake-fake-jobposting-prediction",
        "files":     ["fake_job_postings.csv"],
        "source_tag": "social_media",
        "lang":      "en",
        "schema": {
            "input_cols":        ["title", "company_profile", "description"],
            "label_col":         "fraudulent",  # 0 or 1
            "label_scam_value":  1,
        },
    },
]

# ── Model prompt ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """你是一個專業的詐騙偵測助手。你的任務是分析用戶提供的訊息（可能是簡訊、網址、社群媒體貼文或其他文字內容），判斷其是否為詐騙，並提供詳細的分析理由。

請依照以下格式回覆：
1. **判定結果**：詐騙 / 非詐騙
2. **風險等級**：高風險 / 中風險 / 低風險
3. **詐騙類型**（若為詐騙）：例如貸款詐騙、釣魚網站、投資詐騙、購物詐騙等
4. **分析理由**：列出具體的可疑特徵或安全指標
5. **建議行動**：給用戶的具體建議"""
