"""Docs API — serves the curated, user-facing Help & Documentation content.

Scope is deliberately limited to ``docs/help/`` (curated, user-facing), NOT the
whole ``docs/`` tree which also holds internal architecture/engineering notes.

Convention over configuration: a doc's title is its first ``#`` heading; top-level
subfolders under ``docs/help/`` become sections, and loose files sit in a default
"Overview" section. New docs appear just by adding markdown files — no code change.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/docs", tags=["docs"])

# repo_root/docs/help — from src/actor_factory/api/docs.py that's four parents up.
HELP_ROOT = Path(__file__).parent.parent.parent.parent / "docs" / "help"

# Friendly labels + display order for known sections. Unknown sections sort
# after these alphabetically, with an auto title-cased label.
_SECTION_ORDER = {"": 0, "getting-started": 1, "concepts": 2, "guides": 3}
_DEFAULT_SECTION = "Overview"


def _titleize(name: str) -> str:
    return name.replace("-", " ").replace("_", " ").title()


def _extract_title(content: str, fallback: str) -> str:
    """First markdown ``# `` heading in the first few lines, else the stem."""
    for line in content.split("\n")[:5]:
        if line.startswith("# "):
            return line[2:].strip()
    return _titleize(fallback)


def _slug(md_file: Path) -> str:
    """Stable slug: the path under docs/help/, no extension (posix)."""
    return md_file.relative_to(HELP_ROOT).with_suffix("").as_posix()


def _hidden(path: Path, base: Path) -> bool:
    return any(part.startswith(".") for part in path.relative_to(base).parts)


def _doc_entry(md_file: Path) -> dict:
    title = _extract_title(md_file.read_text(encoding="utf-8"), md_file.stem)
    return {"slug": _slug(md_file), "title": title, "filename": md_file.name}


@router.get("")
def list_docs() -> dict:
    """The Help & Docs tree grouped into sections by top-level subfolder.

    Shape::
        {"sections": [{"id","label","docs":[{slug,title,filename}]}]}
    """
    if not HELP_ROOT.is_dir():
        return {"sections": []}

    by_section: dict[str, list[dict]] = {}
    for md_file in sorted(HELP_ROOT.rglob("*.md")):
        if _hidden(md_file, HELP_ROOT):
            continue
        rel = md_file.relative_to(HELP_ROOT)
        section_id = rel.parts[0] if len(rel.parts) > 1 else ""
        by_section.setdefault(section_id, []).append(_doc_entry(md_file))

    sections = [
        {"id": sid, "label": _DEFAULT_SECTION if sid == "" else _titleize(sid), "docs": docs}
        for sid, docs in by_section.items()
    ]
    sections.sort(key=lambda s: (_SECTION_ORDER.get(s["id"], 99), s["label"]))
    return {"sections": sections}


@router.get("/{slug:path}")
def get_doc(slug: str) -> dict:
    """Return one doc's markdown by slug (path under docs/help/, no extension).

    Guarded against path traversal: the resolved target must be a markdown file
    inside HELP_ROOT.
    """
    if not slug:
        raise HTTPException(status_code=404, detail="Doc not found")

    candidate = (HELP_ROOT / f"{slug}.md").resolve()
    root_resolved = HELP_ROOT.resolve()
    if not candidate.is_relative_to(root_resolved):
        raise HTTPException(status_code=404, detail="Doc not found")
    if candidate.suffix != ".md" or not candidate.is_file():
        raise HTTPException(status_code=404, detail="Doc not found")

    content = candidate.read_text(encoding="utf-8")
    return {
        "slug": candidate.relative_to(root_resolved).with_suffix("").as_posix(),
        "content": content,
        "title": _extract_title(content, candidate.stem),
    }
