"""
GuardCircle SFT Pipeline — Two-Stage Orchestrator

Stage 1: Cold Start (public English/multilingual datasets)
  A. Download  →  stage1_download_datasets.py
  B. Preprocess →  stage1_preprocess.py

Stage 2: Domain SFT (TW competition data + Sonnet distillation)
  1. Parse xlsx         →  stage2_step1_parse_dataset.py
  2. Sonnet justifications →  stage2_step2_gen_justifications.py
  3. Generate non-scam  →  stage2_step3_gen_non_scam.py
  4. Build final JSONL  →  stage2_step4_build_dataset.py

Usage:
    python run_pipeline.py                  # run everything
    python run_pipeline.py --stage 1        # only stage 1
    python run_pipeline.py --stage 2        # only stage 2
    python run_pipeline.py --stage 1 --step B       # stage 1, step B only
    python run_pipeline.py --stage 2 --step 3       # stage 2, step 3 only
"""

import argparse
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent

STAGE1_STEPS = [
    ("A", "stage1_download_datasets.py", "Download public datasets (Kaggle + HuggingFace)"),
    ("B", "stage1_preprocess.py",        "Preprocess → Stage 1 SFT JSONL"),
]

STAGE2_STEPS = [
    ("1", "stage2_step1_parse_dataset.py",       "Parse competition xlsx → raw JSONL"),
    ("2", "stage2_step2_gen_justifications.py",  "Sonnet: generate scam justifications"),
    ("3", "stage2_step3_gen_non_scam.py",        "Sonnet: generate non-scam data"),
    ("4", "stage2_step4_build_dataset.py",       "Build final Stage 2 train/val JSONL"),
]


def run_step(script: str, description: str):
    print(f"\n{'─'*60}")
    print(f"  {description}")
    print(f"  python {script}")
    print(f"{'─'*60}\n")

    result = subprocess.run(
        [sys.executable, str(BASE / script)],
        cwd=str(BASE),
    )
    if result.returncode != 0:
        print(f"\n❌  Step failed: {script}  (exit code {result.returncode})")
        sys.exit(1)


def run_stage(stage_num: int, only_step: str | None, steps: list[tuple]):
    header = "Stage 1 — Cold Start" if stage_num == 1 else "Stage 2 — Domain SFT"
    print(f"\n{'='*60}")
    print(f"  {header}")
    print(f"{'='*60}")

    for step_id, script, desc in steps:
        if only_step and step_id != only_step:
            continue
        run_step(script, f"[{step_id}] {desc}")


def main():
    parser = argparse.ArgumentParser(
        description="GuardCircle SFT pipeline — two-stage fine-tuning data generation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--stage", type=int, choices=[1, 2],
                        help="Run only stage 1 or 2 (default: both)")
    parser.add_argument("--step", type=str,
                        help="Run only a specific step within the chosen stage (e.g. A, B, 1, 2)")
    args = parser.parse_args()

    if args.step and not args.stage:
        parser.error("--step requires --stage")

    run_s1 = not args.stage or args.stage == 1
    run_s2 = not args.stage or args.stage == 2

    if run_s1:
        run_stage(1, args.step, STAGE1_STEPS)
    if run_s2:
        run_stage(2, args.step, STAGE2_STEPS)

    print(f"\n✅  Pipeline complete!\n")
    if run_s1:
        print("  Stage 1 outputs: data/stage1_out/")
        print("    s1_train.jsonl  —  cold-start training set")
        print("    s1_val.jsonl    —  cold-start validation set")
    if run_s2:
        print("  Stage 2 outputs: data/stage2_out/")
        print("    s2_train.jsonl  —  domain SFT training set")
        print("    s2_val.jsonl    —  domain SFT validation set")
    print()
    print("  Next: open sagemaker_finetune_qwen3_7b.ipynb on SageMaker")


if __name__ == "__main__":
    main()
