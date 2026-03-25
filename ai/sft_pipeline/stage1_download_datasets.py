"""
Stage 1 — Step A: Download all public datasets.

Handles three download strategies:
  - 'huggingface':  datasets library load_dataset() (standard Parquet repos)
  - 'hf_raw':       huggingface_hub direct file download (script-based repos)
  - 'kaggle':       kaggle CLI (requires API key)

Usage:
    python stage1_download_datasets.py              # download everything
    python stage1_download_datasets.py --id sms_spam hf_difraud  # subset
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from config import PUBLIC_DATASETS, STAGE1_RAW_DIR


def ensure_dir(path: str) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


# ── HuggingFace datasets library ─────────────────────────────────────────────

def download_huggingface(dataset: dict, out_dir: Path):
    from datasets import load_dataset

    handle = dataset["handle"]
    ds_out = out_dir / dataset["id"]
    ds_out.mkdir(exist_ok=True)

    for cfg in dataset["configs"]:
        config_name = cfg["config"]
        split = cfg["split"]

        save_path = ds_out / f"{config_name or 'default'}_{split}.jsonl"
        if save_path.exists():
            print(f"  ✅ Already downloaded: {handle} [{config_name or 'default'}]")
            continue

        print(f"  📥 Loading {handle} [{config_name or 'default'}] split={split}...")
        try:
            load_kwargs = {"path": handle, "split": split}
            if config_name:
                load_kwargs["name"] = config_name

            ds = load_dataset(**load_kwargs)
            ds.to_json(str(save_path), force_ascii=False)
            print(f"     ✅ {len(ds)} rows → {save_path.name}")
        except Exception as e:
            print(f"     ❌ Failed: {e}")


# ── HuggingFace raw file download ────────────────────────────────────────────

def download_hf_raw(dataset: dict, out_dir: Path):
    from huggingface_hub import hf_hub_download

    handle = dataset["handle"]
    ds_out = out_dir / dataset["id"]
    ds_out.mkdir(exist_ok=True)

    for rf in dataset["raw_files"]:
        filename = rf["file"]
        save_path = ds_out / filename.replace("/", "_")

        if save_path.exists():
            print(f"  ✅ Already downloaded: {filename}")
            continue

        print(f"  📥 Downloading {handle}/{filename}...")
        try:
            local = hf_hub_download(
                repo_id=handle, filename=filename,
                repo_type="dataset",
            )
            # Copy to our output dir (hf_hub caches it, we want a local copy)
            import shutil
            shutil.copy2(local, save_path)

            # Count rows
            n = 0
            with open(save_path, encoding="utf-8") as f:
                if filename.endswith(".json"):
                    data = json.load(f)
                    n = len(data) if isinstance(data, list) else 1
                elif filename.endswith(".jsonl"):
                    for _ in f:
                        n += 1
            print(f"     ✅ {n} rows → {save_path.name}")
        except Exception as e:
            print(f"     ❌ Failed: {e}")


# ── Kaggle ────────────────────────────────────────────────────────────────────

def check_kaggle_auth() -> bool:
    """Check for any supported Kaggle auth method."""
    # New token-based auth (KGAT_xxx)
    if os.environ.get("KAGGLE_API_TOKEN"):
        return True
    # Legacy: separate username + key env vars
    if os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"):
        return True
    # Legacy: kaggle.json file
    if (Path.home() / ".kaggle" / "kaggle.json").exists():
        return True
    # New: access_token file
    if (Path.home() / ".kaggle" / "access_token").exists():
        return True
    return False


def load_dotenv():
    """Load .env file from pipeline directory if it exists."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())


def download_kaggle(dataset: dict, out_dir: Path):
    load_dotenv()

    handle = dataset["handle"]
    target = out_dir / dataset["id"]
    target.mkdir(exist_ok=True)

    expected = [target / f for f in dataset.get("files", [])]
    if expected and all(f.exists() for f in expected):
        print(f"  ✅ Already downloaded: {dataset['name']}")
        return

    if not check_kaggle_auth():
        print(f"  ⚠️  Kaggle credentials missing — skipping {dataset['name']}")
        print(f"     Option 1: Add KAGGLE_API_TOKEN=KGAT_xxx to .env file")
        print(f"     Option 2: export KAGGLE_API_TOKEN=KGAT_xxx")
        return

    print(f"  📥 Downloading {dataset['name']} from Kaggle...")
    result = subprocess.run(
        ["kaggle", "datasets", "download", "-d", handle, "--unzip", "-p", str(target)],
        capture_output=True, text=True,
        env={**os.environ},  # pass through env including KAGGLE_API_TOKEN
    )
    if result.returncode == 0:
        print(f"     ✅ Saved to {target}")
    else:
        print(f"     ❌ Failed: {result.stderr.strip()}")


# ── Dispatch ──────────────────────────────────────────────────────────────────

DOWNLOADERS = {
    "huggingface": download_huggingface,
    "hf_raw":      download_hf_raw,
    "kaggle":      download_kaggle,
}


def main():
    parser = argparse.ArgumentParser(description="Download Stage 1 public datasets")
    parser.add_argument(
        "--id", nargs="*",
        help="Dataset IDs to download (default: all). E.g. --id sms_spam hf_difraud"
    )
    args = parser.parse_args()

    out_dir = ensure_dir(STAGE1_RAW_DIR)
    print(f"Output directory: {out_dir.resolve()}\n")

    # Save registry
    (out_dir / "registry.json").write_text(
        json.dumps(PUBLIC_DATASETS, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    selected = set(args.id) if args.id else None
    datasets = [d for d in PUBLIC_DATASETS if not selected or d["id"] in selected]

    print(f"Downloading {len(datasets)} dataset(s)...\n")
    for ds in datasets:
        print(f"[{ds['id']}] {ds['name']}")
        downloader = DOWNLOADERS.get(ds["type"])
        if downloader:
            downloader(ds, out_dir)
        else:
            print(f"  ⚠️  Unknown type: {ds['type']}")
        print()

    print("✅ Download step complete.")
    print(f"   Raw data in: {out_dir.resolve()}")
    print(f"   Next step:   python stage1_preprocess.py")


if __name__ == "__main__":
    main()
