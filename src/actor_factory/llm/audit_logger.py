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


def log_llm_call(
    call_type: str,
    call_id: str,
    domain_context: Dict[str, Any],
    prompt_modifiers: Dict[str, Any],
    provider: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_text: str,
    duration_ms: int,
    tokens: Optional[Dict[str, int]] = None,
    validation_passed: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Logs a single LLM execution to daily JSONL file. Auto-archives past log files into .jsonl.gz.
    """
    config = get_audit_config()
    if not config.get("enabled", True):
        return None

    if call_type in config.get("disabled_call_types", []):
        return None

    check_and_rollover_archives()

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
            "total": prompt_tokens + completion_tokens
        }

    entry = {
        "id": f"{time_str}_{call_type}_{git_info['sha']}",
        "timestamp": now.isoformat(),
        "duration_ms": duration_ms,
        "git": git_info,
        "call_type": call_type,
        "call_id": call_id,
        "domain_context": domain_context,
        "prompt_construction": {
            "template_used": "persona_skill_specialization_matrix",
            "modifiers": prompt_modifiers
        },
        "llm": {
            "provider": provider,
            "model": model,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "response": response_text,
            "tokens": tokens
        },
        "post_processing": {
            "sanitizer_applied": False,
            "validation_passed": validation_passed,
            "retry_count": 0
        }
    }

    log_filepath = os.path.join(AUDIT_DIR, f"{date_str}.jsonl")
    try:
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
