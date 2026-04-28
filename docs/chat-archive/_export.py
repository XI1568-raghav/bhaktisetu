"""
Export Claude Code JSONL transcripts to per-session markdown files.

Reads every .jsonl in C:\\Users\\DELL\\.claude\\projects\\E--NewClaude\\
and writes one .md per session into the same directory as this script,
plus an INDEX.md.

Verbatim user + assistant text. Tool calls and tool results collapsed to
one-line summaries (otherwise the output is unreadable).
"""

import io
import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SRC_DIR = Path(r"C:\Users\DELL\.claude\projects\E--NewClaude")
OUT_DIR = Path(r"E:\NewClaude\bhaktisetu\docs\chat-archive")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MAX_TOOL_RESULT_PREVIEW = 400  # chars
MAX_TOOL_INPUT_PREVIEW = 300


def fmt_ts(iso: str) -> str:
    if not iso:
        return ""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        return iso


def truncate(text: str, n: int) -> str:
    if not isinstance(text, str):
        text = str(text)
    text = text.replace("\r\n", "\n")
    if len(text) <= n:
        return text
    return text[:n] + f"... [+{len(text) - n} chars]"


def extract_text_blocks(content):
    """content may be a str or a list of {type, text|...} blocks. Return list of dicts."""
    out = []
    if isinstance(content, str):
        out.append({"kind": "text", "text": content})
        return out
    if not isinstance(content, list):
        return out
    for block in content:
        if not isinstance(block, dict):
            continue
        t = block.get("type")
        if t == "text":
            out.append({"kind": "text", "text": block.get("text", "")})
        elif t == "thinking":
            out.append({"kind": "thinking", "text": block.get("thinking", "")})
        elif t == "tool_use":
            out.append(
                {
                    "kind": "tool_use",
                    "name": block.get("name", "?"),
                    "input": block.get("input", {}),
                    "id": block.get("id", ""),
                }
            )
        elif t == "tool_result":
            content_inner = block.get("content", "")
            if isinstance(content_inner, list):
                # nested blocks
                parts = []
                for c in content_inner:
                    if isinstance(c, dict) and c.get("type") == "text":
                        parts.append(c.get("text", ""))
                    else:
                        parts.append(json.dumps(c)[:200])
                content_inner = "\n".join(parts)
            out.append(
                {
                    "kind": "tool_result",
                    "tool_use_id": block.get("tool_use_id", ""),
                    "is_error": block.get("is_error", False),
                    "text": content_inner,
                }
            )
        elif t == "image":
            out.append({"kind": "image", "text": "[image attached]"})
        else:
            out.append({"kind": "other", "text": f"[{t} block]"})
    return out


def summarize_tool_input(name: str, inp) -> str:
    """One-line summary of the tool call args."""
    if not isinstance(inp, dict):
        return truncate(str(inp), MAX_TOOL_INPUT_PREVIEW)
    if name in ("Read", "Write"):
        return f"file_path={inp.get('file_path', '?')}"
    if name == "Edit":
        return f"file_path={inp.get('file_path', '?')}"
    if name == "Bash":
        cmd = inp.get("command", "")
        return f"`{truncate(cmd, MAX_TOOL_INPUT_PREVIEW)}`"
    if name == "PowerShell":
        cmd = inp.get("command", "")
        return f"`{truncate(cmd, MAX_TOOL_INPUT_PREVIEW)}`"
    if name == "Grep":
        return f"pattern={inp.get('pattern', '?')!r} path={inp.get('path', '.')}"
    if name == "Glob":
        return f"pattern={inp.get('pattern', '?')}"
    if name == "TaskCreate":
        return f"subject={inp.get('subject', '?')}"
    if name == "TaskUpdate":
        return f"taskId={inp.get('taskId', '?')} status={inp.get('status', '?')}"
    if name == "WebFetch":
        return f"url={inp.get('url', '?')}"
    if name == "WebSearch":
        return f"query={inp.get('query', '?')}"
    return truncate(json.dumps(inp, ensure_ascii=False), MAX_TOOL_INPUT_PREVIEW)


def render_session(jsonl_path: Path) -> dict:
    """Read a JSONL transcript, write a .md, return metadata."""
    session_id = jsonl_path.stem
    md_path = OUT_DIR / f"{session_id}.md"

    user_msgs = 0
    assistant_msgs = 0
    tool_calls = 0
    first_ts = None
    last_ts = None
    first_user_prompt = None
    cwds = set()
    branches = set()

    lines_out = [f"# Session `{session_id}`\n"]
    header_placeholder_idx = len(lines_out)
    lines_out.append("")  # placeholder for stats — filled in at end

    with jsonl_path.open("r", encoding="utf-8", errors="replace") as f:
        for raw in f:
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError:
                continue

            t = obj.get("type")
            ts = obj.get("timestamp")
            if ts:
                if first_ts is None:
                    first_ts = ts
                last_ts = ts

            cwd = obj.get("cwd")
            if cwd:
                cwds.add(cwd)
            br = obj.get("gitBranch")
            if br:
                branches.add(br)

            if t == "user":
                msg = obj.get("message", {})
                content = msg.get("content", "")
                blocks = extract_text_blocks(content)

                # is this a real user prompt or just a tool_result wrapper?
                is_real_prompt = any(b["kind"] == "text" for b in blocks) and not all(
                    b["kind"] == "tool_result" for b in blocks
                )

                if is_real_prompt:
                    user_msgs += 1
                    text = "\n".join(b["text"] for b in blocks if b["kind"] == "text").strip()
                    if text and first_user_prompt is None:
                        first_user_prompt = text[:200]
                    lines_out.append(f"\n## 👤 User · {fmt_ts(ts)}\n")
                    if text:
                        lines_out.append(text)
                    else:
                        lines_out.append("_(empty)_")
                else:
                    # tool_result content — collapsed
                    for b in blocks:
                        if b["kind"] == "tool_result":
                            err = " ⚠️ error" if b.get("is_error") else ""
                            preview = truncate(b["text"], MAX_TOOL_RESULT_PREVIEW)
                            lines_out.append(
                                f"\n> _tool result{err}_: ```\n{preview}\n```"
                            )

            elif t == "assistant":
                msg = obj.get("message", {})
                if obj.get("isApiErrorMessage"):
                    err = obj.get("error", "api_error")
                    text = ""
                    for b in extract_text_blocks(msg.get("content", "")):
                        if b["kind"] == "text":
                            text = b["text"]
                            break
                    lines_out.append(f"\n## ⚠️ Assistant API error · {fmt_ts(ts)}\n")
                    lines_out.append(f"`{err}` — {truncate(text, 200)}")
                    continue

                content = msg.get("content", "")
                blocks = extract_text_blocks(content)
                if not blocks:
                    continue

                assistant_msgs += 1
                lines_out.append(f"\n## 🤖 Assistant · {fmt_ts(ts)}\n")
                for b in blocks:
                    if b["kind"] == "text":
                        txt = b["text"].strip()
                        if txt:
                            lines_out.append(txt)
                    elif b["kind"] == "thinking":
                        thinking_txt = b["text"].strip()
                        if thinking_txt:
                            lines_out.append(
                                f"<details><summary>💭 thinking</summary>\n\n{truncate(thinking_txt, 2000)}\n\n</details>"
                            )
                    elif b["kind"] == "tool_use":
                        tool_calls += 1
                        summary = summarize_tool_input(b["name"], b["input"])
                        lines_out.append(f"\n> 🔧 **{b['name']}** — {summary}")
                    elif b["kind"] == "image":
                        lines_out.append("\n> 🖼️ [image]")
                    else:
                        lines_out.append(f"\n> {b['text']}")

            # other types (permission-mode, file-history-snapshot, attachment, last-prompt) skipped

    # build the header stats now that we have totals
    header = []
    header.append(f"- **File**: `{jsonl_path}`")
    if first_ts:
        header.append(f"- **Started**: {fmt_ts(first_ts)}")
    if last_ts and last_ts != first_ts:
        header.append(f"- **Ended**:   {fmt_ts(last_ts)}")
    header.append(f"- **User messages**: {user_msgs}")
    header.append(f"- **Assistant messages**: {assistant_msgs}")
    header.append(f"- **Tool calls**: {tool_calls}")
    if cwds:
        header.append(f"- **Working dirs**: {', '.join(sorted(cwds))}")
    if branches:
        header.append(f"- **Git branches**: {', '.join(sorted(branches))}")
    if first_user_prompt:
        header.append(f"- **First prompt**: _{truncate(first_user_prompt, 150)}_")

    lines_out[header_placeholder_idx] = "\n".join(header) + "\n\n---"

    md_path.write_text("\n".join(lines_out), encoding="utf-8")

    return {
        "session_id": session_id,
        "md_path": md_path,
        "jsonl_path": jsonl_path,
        "first_ts": first_ts,
        "last_ts": last_ts,
        "user_msgs": user_msgs,
        "assistant_msgs": assistant_msgs,
        "tool_calls": tool_calls,
        "first_user_prompt": first_user_prompt,
        "cwds": sorted(cwds),
        "branches": sorted(branches),
    }


def main():
    jsonl_files = sorted(SRC_DIR.glob("*.jsonl"))
    print(f"Found {len(jsonl_files)} JSONL transcripts")

    metas = []
    for p in jsonl_files:
        size_mb = p.stat().st_size / (1024 * 1024)
        print(f"  → processing {p.name} ({size_mb:.1f} MB)...")
        meta = render_session(p)
        metas.append(meta)
        print(
            f"    user={meta['user_msgs']} assistant={meta['assistant_msgs']} tools={meta['tool_calls']}"
        )

    # sort by first_ts
    metas.sort(key=lambda m: m["first_ts"] or "")

    # INDEX.md
    idx = ["# Darshya / BhaktiSetu — Chat Archive\n"]
    idx.append(
        "Verbatim per-session transcripts of every Claude Code session under `E:\\NewClaude\\`. "
        "Tool calls and tool results are collapsed to one-line summaries.\n"
    )
    idx.append(f"- Source: `{SRC_DIR}`")
    idx.append(f"- Sessions: **{len(metas)}**")
    total_user = sum(m["user_msgs"] for m in metas)
    total_asst = sum(m["assistant_msgs"] for m in metas)
    total_tools = sum(m["tool_calls"] for m in metas)
    idx.append(
        f"- Totals: **{total_user}** user prompts · **{total_asst}** assistant turns · **{total_tools}** tool calls"
    )
    idx.append("")
    idx.append("| Date | Session | User | Asst | Tools | First prompt |")
    idx.append("|---|---|---:|---:|---:|---|")
    for m in metas:
        date = (m["first_ts"] or "")[:10]
        first = (m["first_user_prompt"] or "").replace("|", "\\|").replace("\n", " ")
        first = truncate(first, 80)
        idx.append(
            f"| {date} | [`{m['session_id'][:8]}…`]({m['session_id']}.md) | "
            f"{m['user_msgs']} | {m['assistant_msgs']} | {m['tool_calls']} | {first} |"
        )

    (OUT_DIR / "INDEX.md").write_text("\n".join(idx), encoding="utf-8")
    print(f"\nWrote {len(metas)} session files + INDEX.md to {OUT_DIR}")


if __name__ == "__main__":
    main()
