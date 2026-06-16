#!/usr/bin/env python3

"""Pre-tool-use guard for Codex and Claude Code.

Two layers of enforcement:

1. Always block obviously destructive commands.
2. Gate edits to the product wiki behind an approved proposal.

The wiki gate has two modes, chosen by the PRODUCT_WIKI_ENFORCE env var:

- "advisory" (default): print a reminder, allow the edit (exit 0).
- "block": refuse to edit wiki/ unless an approved proposal exists (exit 2).

Set PRODUCT_WIKI_ENFORCE=block in .claude/settings.json or .codex/config.toml
once your approval workflow is settled.
"""

import glob
import json
import os
import re
import sys


def project_root() -> str:
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.environ.get("PRODUCT_WIKI_ROOT")
    return root or os.getcwd()


def edited_path(tool_input: dict, text: str) -> str:
    for key in ("file_path", "path", "filePath"):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def has_approved_proposal(root: str) -> bool:
    for path in glob.glob(os.path.join(root, "intake", "proposals", "*.md")):
        try:
            with open(path, "r", encoding="utf8") as handle:
                if re.search(r"^status:\s*approved\b", handle.read(), re.MULTILINE):
                    return True
        except OSError:
            continue
    return False


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_name = payload.get("tool_name") or payload.get("tool") or ""
    tool_input = payload.get("tool_input") or payload.get("input") or {}
    text = json.dumps(tool_input)

    for pattern in (r"rm\s+-rf\s+/", r"git\s+reset\s+--hard", r"git\s+push\s+--force"):
        if re.search(pattern, text):
            print(f"Blocked dangerous command by Product Wiki guard: {pattern}", file=sys.stderr)
            return 2

    if tool_name in {"Write", "Edit", "MultiEdit"}:
        path = edited_path(tool_input, text)
        touches_wiki = path.startswith("wiki/") or "/wiki/" in path or (not path and '"wiki/' in text)
        touches_proposal = "intake/proposals" in path or "intake/proposals" in text
        if touches_wiki and not touches_proposal:
            mode = (os.environ.get("PRODUCT_WIKI_ENFORCE") or "advisory").strip().lower()
            if mode == "block" and not has_approved_proposal(project_root()):
                print(
                    "Blocked by Product Wiki guard: wiki edits require an approved proposal in "
                    "intake/proposals/ (PRODUCT_WIKI_ENFORCE=block). Approve a proposal first, "
                    "or use propose-change.",
                    file=sys.stderr,
                )
                return 2
            print(
                "Product Wiki note: wiki edits should come from an approved proposal.",
                file=sys.stderr,
            )
            return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
