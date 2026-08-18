import os
import gzip
import json
from datetime import datetime, timezone
from src.actor_factory.llm.audit_logger import (
    log_llm_call,
    query_audit_logs,
    list_log_dates,
    check_and_rollover_archives,
    AUDIT_DIR,
    ARCHIVE_DIR,
)

def test_audit_logger_write_and_query(tmp_path):
    # Log a sample LLM call
    entry = log_llm_call(
        call_type="design_ecommerce_solution",
        call_id="software_architect/mermaid_diagram",
        domain_context={"domain_name": "Software Engineering"},
        prompt_modifiers={"persona": "Software Architect", "skill": "Mermaid Diagram Building"},
        provider="ollama",
        model="gemma4:12b",
        system_prompt="Act as a Software Architect",
        user_prompt="Design an e-commerce checkout flow",
        response_text="## Solution ##\nOrchestrated Saga Pattern",
        duration_ms=2500,
        tokens={"prompt": 500, "completion": 800, "total": 1300}
    )

    assert entry is not None
    assert entry["call_type"] == "design_ecommerce_solution"
    assert entry["llm"]["model"] == "gemma4:12b"
    assert entry["git"]["sha"] != ""

    # Query today's logs
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    results = query_audit_logs(start_date=today_str, end_date=today_str, call_type="design_ecommerce_solution")
    assert len(results) >= 1
    matching = [r for r in results if r["id"] == entry["id"]]
    assert len(matching) == 1
    assert matching[0]["llm"]["provider"] == "ollama"

def test_audit_logger_gzip_archive_rollover():
    # Manually create a historical log file date
    past_date_str = "2026-08-01"
    past_filepath = os.path.join(AUDIT_DIR, f"{past_date_str}.jsonl")
    
    historical_entry = {
        "id": "120000_generate_stories_historical",
        "timestamp": "2026-08-01T12:00:00Z",
        "duration_ms": 1500,
        "git": {"sha": "historical", "branch": "main"},
        "call_type": "generate_stories",
        "call_id": "historical_test",
        "domain_context": {},
        "prompt_construction": {"template_used": "test", "modifiers": {}},
        "llm": {
            "provider": "ollama",
            "model": "gemma4:12b",
            "system_prompt": "Historical system prompt",
            "user_prompt": "Historical user prompt",
            "response": "Historical response text",
            "tokens": {"prompt": 100, "completion": 200, "total": 300}
        },
        "post_processing": {"validation_passed": True}
    }

    with open(past_filepath, "w", encoding="utf-8") as f:
        f.write(json.dumps(historical_entry) + "\n")

    # Run rollover archive check
    check_and_rollover_archives()

    # The raw .jsonl should be removed and compressed .jsonl.gz should exist in archive/
    assert not os.path.exists(past_filepath)
    archive_filepath = os.path.join(ARCHIVE_DIR, f"{past_date_str}.jsonl.gz")
    assert os.path.exists(archive_filepath)

    # Query range including historical date (start_date="2026-08-01", end_date="2026-08-14")
    results = query_audit_logs(start_date="2026-08-01", end_date="2026-08-14", call_type="generate_stories")
    historical_match = [r for r in results if r["id"] == "120000_generate_stories_historical"]
    assert len(historical_match) == 1
    assert historical_match[0]["llm"]["response"] == "Historical response text"
