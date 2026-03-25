"""
Local Stage 1 training script for dual RTX 3080 Ti (2×12GB).

QLoRA 4-bit + gradient checkpointing to fit Qwen3-8B across two GPUs.

Usage:
    conda run -n guardcircle python train_local_stage1.py

    # Resume from checkpoint:
    conda run -n guardcircle python train_local_stage1.py --resume

    # Use smaller model if OOM:
    conda run -n guardcircle python train_local_stage1.py --model Qwen/Qwen3-4B
"""

import argparse
import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig

# ── Paths ─────────────────────────────────────────────────────────────────────
TRAIN_FILE = "./data/stage1_out/s1_train.jsonl"
VAL_FILE   = "./data/stage1_out/s1_val.jsonl"
OUTPUT_DIR = "./checkpoints/stage1_local"


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3-8B",
                        help="Model ID (default: Qwen/Qwen3-8B, fallback: Qwen/Qwen3-4B)")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from last checkpoint in OUTPUT_DIR")
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=1,
                        help="Per-device batch size (default: 1 for 12GB GPU)")
    parser.add_argument("--grad-accum", type=int, default=16,
                        help="Gradient accumulation (effective batch = batch_size × grad_accum × 2 GPUs)")
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--max-seq-len", type=int, default=1024,
                        help="Max sequence length (shorter = less VRAM, default 1024)")
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    return parser.parse_args()


def main():
    args = parse_args()

    # ── GPU info ──────────────────────────────────────────────────────────────
    n_gpus = torch.cuda.device_count()
    for i in range(n_gpus):
        name = torch.cuda.get_device_name(i)
        mem = torch.cuda.get_device_properties(i).total_memory / 1024**3
        print(f"  GPU {i}: {name} ({mem:.0f} GB)")
    print(f"  Total: {n_gpus} GPUs\n")

    effective_batch = args.batch_size * args.grad_accum * n_gpus
    print(f"  Model:           {args.model}")
    print(f"  Epochs:          {args.epochs}")
    print(f"  Per-GPU batch:   {args.batch_size}")
    print(f"  Grad accum:      {args.grad_accum}")
    print(f"  Effective batch: {effective_batch}")
    print(f"  Max seq length:  {args.max_seq_len}")
    print(f"  Learning rate:   {args.lr}")
    print(f"  LoRA r/alpha:    {args.lora_r}/{args.lora_alpha}")
    print()

    # ── Load dataset ──────────────────────────────────────────────────────────
    print("Loading datasets...")
    train_ds = load_dataset("json", data_files=TRAIN_FILE, split="train")
    val_ds   = load_dataset("json", data_files=VAL_FILE,   split="train")
    print(f"  Train: {len(train_ds)}, Val: {len(val_ds)}")

    # ── Load model (QLoRA 4-bit, spread across GPUs) ─────────────────────────
    print(f"\nLoading {args.model} in 4-bit quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Build manual device_map: split transformer layers evenly across GPUs
    from transformers import AutoConfig
    config = AutoConfig.from_pretrained(args.model, trust_remote_code=True)
    num_layers = config.num_hidden_layers  # e.g. 36 for Qwen3-8B
    layers_per_gpu = num_layers // n_gpus

    device_map = {
        "model.embed_tokens": 0,
        "model.norm": n_gpus - 1,
        "model.rotary_emb": 0,
        "lm_head": n_gpus - 1,
    }
    for i in range(num_layers):
        gpu_id = min(i // layers_per_gpu, n_gpus - 1)
        device_map[f"model.layers.{i}"] = gpu_id

    print(f"  Manual device_map: {num_layers} layers → {layers_per_gpu} per GPU")
    for gpu_id in range(n_gpus):
        n = sum(1 for v in device_map.values() if v == gpu_id)
        print(f"    GPU {gpu_id}: {n} modules")

    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=bnb_config,
        device_map=device_map,
        trust_remote_code=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # ── LoRA setup ────────────────────────────────────────────────────────────
    model = prepare_model_for_kbit_training(model)
    model.gradient_checkpointing_enable()  # critical for 12GB GPUs

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Print VRAM usage after loading
    for i in range(n_gpus):
        used = torch.cuda.memory_allocated(i) / 1024**3
        total = torch.cuda.get_device_properties(i).total_memory / 1024**3
        print(f"  GPU {i} VRAM: {used:.1f} / {total:.0f} GB")
    print()

    # ── Remove metadata column (SFTTrainer only needs "messages") ───────────
    print("Preparing datasets...")
    train_fmt = train_ds.remove_columns([c for c in train_ds.column_names if c != "messages"])
    val_fmt   = val_ds.remove_columns([c for c in val_ds.column_names if c != "messages"])

    # ── Training config ───────────────────────────────────────────────────────
    training_args = SFTConfig(
        output_dir=OUTPUT_DIR,
        run_name="guardcircle-stage1-local",

        # Epochs & batching
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,

        # Optimizer
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        weight_decay=0.01,
        optim="paged_adamw_8bit",  # 8-bit optimizer to save VRAM

        # Precision
        bf16=True,

        # Sequence
        max_length=args.max_seq_len,

        # Logging
        logging_steps=20,
        logging_first_step=True,

        # Eval & save
        eval_strategy="steps",
        eval_steps=200,
        save_strategy="steps",
        save_steps=200,
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",

        # Misc
        remove_unused_columns=False,
        report_to="none",
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        dataloader_pin_memory=True,
        dataloader_num_workers=4,
    )

    # ── Train ─────────────────────────────────────────────────────────────────
    trainer = SFTTrainer(
        model=model,
        processing_class=tokenizer,
        train_dataset=train_fmt,
        eval_dataset=val_fmt,
        args=training_args,
    )

    print(f"\n{'='*60}")
    print(f"  Starting Stage 1 local training")
    print(f"  {len(train_fmt)} train / {len(val_fmt)} val samples")
    print(f"  Checkpoints → {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    if args.resume:
        trainer.train(resume_from_checkpoint=True)
    else:
        trainer.train()

    # ── Save ──────────────────────────────────────────────────────────────────
    final_path = os.path.join(OUTPUT_DIR, "final")
    trainer.save_model(final_path)
    tokenizer.save_pretrained(final_path)

    print(f"\n✅ Stage 1 training complete!")
    print(f"   LoRA adapter: {final_path}")
    print(f"   Next: run Stage 2 with this adapter as base")


if __name__ == "__main__":
    main()
