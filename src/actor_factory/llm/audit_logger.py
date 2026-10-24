import os
import json
import gzip
import glob
import subprocess
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

AUDIT_DIR = "output/llm_audit_logs"
ARCHIVE_DIR = "output/llm_audit_logs/archive"
CONFIG_FILE = "output/audit_config.json"

DEFAULT_CALL_TYPES = [
    "design_ecommerce_solution",
    "testbench_execution",
    "analyze_requirements",
    "generate_stories",
    "build_mermaid_diagram",
    "api_design",
    "threat_modeling",
    "replay"
]


def _ensure_directories():
    os.makedirs(AUDIT_DIR, exist_ok=True)
    os.makedirs(ARCHIVE_DIR, exist_ok=True)


def _get_git_info() -> Dict[str, str]:
    sha = "unknown"
    branch = "main"
    try:
        sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL).decode("utf-8").strip()
        branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL).decode("utf-8").strip()
    except Exception:
        pass
    return {"sha": sha, "branch": branch}


def get_audit_config() -> Dict[str, Any]:
    _ensure_directories()
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "enabled": True,
        "disabled_call_types": []
    }


def save_audit_config(config: Dict[str, Any]) -> None:
    _ensure_directories()
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def check_and_rollover_archives():
    """
    Check existing log files in AUDIT_DIR.
    If a log file date is strictly less than today's date, gzip compress it into ARCHIVE_DIR.
    """
    _ensure_directories()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    pattern = os.path.join(AUDIT_DIR, "*.jsonl")

    for filepath in glob.glob(pattern):
        filename = os.path.basename(filepath)
        date_part = filename.replace(".jsonl", "")
        if date_part < today_str:
            archive_filepath = os.path.join(ARCHIVE_DIR, f"{date_part}.jsonl.gz")
            try:
                with open(filepath, "rb") as f_in:
                    with gzip.open(archive_filepath, "wb") as f_out:
                        f_out.writelines(f_in)
                os.remove(filepath)
            except Exception as e:
                print(f"Error archiving log file {filename}: {e}")


# Current canonical schema version for the audit record. Bump on breaking
# changes to the record shape so a reader can adapt.
SCHEMA_VERSION = "1.0"


def log_llm_call(
    *,
    # ── Call context (why) ──────────────────────────────────────────────────
    call_type: str,
    call_id: str = "",
    context: Optional[Dict[str, Any]] = None,
    goal: Optional[Dict[str, Any]] = None,
    # ── Provenance (which code/prompt) ──────────────────────────────────────
    actor: str = "",
    catalog_version: Optional[str] = None,
    construction: Optional[Dict[str, Any]] = None,
    # ── Model (what answered) ───────────────────────────────────────────────
    provider: str = "",
    model: str = "",
    model_params: Optional[Dict[str, Any]] = None,
    # ── Inputs (what was asked) ─────────────────────────────────────────────
    system_prompt: str = "",
    user_prompt: str = "",
    # ── Response (what came back) ───────────────────────────────────────────
    response_text: str = "",
    parsed: Optional[Any] = None,
    confidence: Optional[Any] = None,
    flags: Optional[List[Any]] = None,
    # ── Stats (how it performed) ────────────────────────────────────────────
    duration_ms: int = 0,
    tokens: Optional[Dict[str, Any]] = None,
    finish_reason: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Log one LLM call as a **canonical** record (schema v1.0).

    Five groups: ``context`` · ``provenance`` · ``model`` · ``inputs`` ·
    ``response`` · ``stats``. Writes one JSON object per line to the daily JSONL
    file; auto-archives past days to ``.jsonl.gz``. Fail-open: a write/config
    error never raises to the caller.

    ``tokens`` may carry an ``approximate`` flag; if omitted entirely it is
    estimated by word count and marked approximate.
    """
    try:
        config = get_audit_config()
    except Exception:
        config = {"enabled": True, "disabled_call_types": []}

    if not config.get("enabled", True):
        return None
    if call_type in config.get("disabled_call_types", []):
        return None

    try:
        check_and_rollover_archives()
    except Exception:
        pass

    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H%M%S")
    git_info = _get_git_info()

    if not tokens:
        prompt_tokens = len((system_prompt + user_prompt).split())
        completion_tokens = len(response_text.split())
        tokens = {
            "prompt": prompt_tokens,
            "completion": completion_tokens,
            "total": prompt_tokens + completion_tokens,
            "approximate": True,
        }

    entry = {
        "schema_version": SCHEMA_VERSION,
        "id": f"{time_str}_{call_type}_{git_info['sha']}",
        "timestamp": now.isoformat(),
        # 1. Call context — why the call happened.
        "context": {
            "call_type": call_type,
            "call_id": call_id,
            "goal": goal or {},
            **(context or {}),
        },
        # 2. Provenance — which code + prompt produced it.
        "provenance": {
            "git": git_info,
            "actor": actor,
            "catalog_version": catalog_version,
            "construction": construction or {},
        },
        # 3. Model — what answered.
        "model": {
            "provider": provider,
            "name": model,
            "params": model_params or {},
        },
        # 4. Inputs — what was asked.
        "inputs": {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
        },
        # 5. Response — what came back.
        "response": {
            "raw": response_text,
            "parsed": parsed,
            "confidence": confidence,
            "flags": flags or [],
        },
        # 6. Stats — how it performed.
        "stats": {
            "tokens": tokens,
            "duration_ms": duration_ms,
            "finish_reason": finish_reason,
        },
    }

    log_filepath = os.path.join(AUDIT_DIR, f"{date_str}.jsonl")
    try:
        _ensure_directories()
        with open(log_filepath, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print(f"Failed to write audit log entry: {e}")

    return entry


def query_audit_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    call_type: Optional[str] = None,
    search_query: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Queries audit log entries across date range (Start Date -> End Date).
    Uncompresses .jsonl.gz archive files on-demand for requested historical dates.
    """
    _ensure_directories()
    check_and_rollover_archives()

    entries = []
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    s_date = start_date or today_str
    e_date = end_date or today_str

    candidate_files = []

    for fp in glob.glob(os.path.join(AUDIT_DIR, "*.jsonl")):
        fn = os.path.basename(fp).replace(".jsonl", "")
        if s_date <= fn <= e_date:
            candidate_files.append((fn, fp, False))

    for fp in glob.glob(os.path.join(ARCHIVE_DIR, "*.jsonl.gz")):
        fn = os.path.basename(fp).replace(".jsonl.gz", "")
        if s_date <= fn <= e_date:
            candidate_files.append((fn, fp, True))

    candidate_files.sort(key=lambda x: x[0], reverse=True)

    query_lower = search_query.lower() if search_query else None

    for _, filepath, is_gz in candidate_files:
        try:
            open_fn = gzip.open if is_gz else open
            with open_fn(filepath, "rt", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        entry = json.loads(line)
                        if call_type and call_type != "all" and entry.get("call_type") != call_type:
                            continue

                        if query_lower:
                            full_text = json.dumps(entry).lower()
                            if query_lower not in full_text:
                                continue

                        entries.append(entry)
                        if len(entries) >= limit:
                            break
                    except Exception:
                        continue
        except Exception as e:
            print(f"Error reading audit log file {filepath}: {e}")

        if len(entries) >= limit:
            break

    entries.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return entries[:limit]


def distinct_call_types(limit_files: int = 14) -> List[str]:
    """Scan recent log files (live + archives) and return the distinct call_types
    that actually appear. Reads the canonical ``context.call_type`` with a
    fallback to the legacy top-level ``call_type``. Bounded to the most recent
    ``limit_files`` days so it stays cheap."""
    _ensure_directories()
    seen: set[str] = set()
    files = []
    for fp in glob.glob(os.path.join(AUDIT_DIR, "*.jsonl")):
        files.append((os.path.basename(fp), fp, False))
    for fp in glob.glob(os.path.join(ARCHIVE_DIR, "*.jsonl.gz")):
        files.append((os.path.basename(fp), fp, True))
    files.sort(key=lambda x: x[0], reverse=True)
    for _, filepath, is_gz in files[:limit_files]:
        try:
            open_fn = gzip.open if is_gz else open
            with open_fn(filepath, "rt", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        e = json.loads(line)
                    except Exception:
                        continue
                    ct = (e.get("context") or {}).get("call_type") or e.get("call_type")
                    if ct:
                        seen.add(ct)
        except Exception:
            continue
    return sorted(seen)


def list_log_dates() -> List[Dict[str, Any]]:
    """
    Returns summary of available dates (today + archived) with entry counts and file sizes.
    """
    _ensure_directories()
    check_and_rollover_archives()

    date_summaries = []
    
    for fp in glob.glob(os.path.join(AUDIT_DIR, "*.jsonl")):
        fn = os.path.basename(fp).replace(".jsonl", "")
        size = os.path.getsize(fp)
        date_summaries.append({
            "date": fn,
            "status": "active",
            "size_bytes": size,
            "compressed": False
        })

    for fp in glob.glob(os.path.join(ARCHIVE_DIR, "*.jsonl.gz")):
        fn = os.path.basename(fp).replace(".jsonl.gz", "")
        size = os.path.getsize(fp)
        date_summaries.append({
            "date": fn,
            "status": "archived",
            "size_bytes": size,
            "compressed": True
        })

    date_summaries.sort(key=lambda x: x["date"], reverse=True)
    return date_summaries
