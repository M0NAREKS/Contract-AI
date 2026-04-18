from __future__ import annotations

import re
from dataclasses import dataclass


CLAUSE_START_RE = re.compile(
    r"^(?P<label>(?:\d+(?:\.\d+)*|[A-Z]|[IVXLCDM]+)[\.\)\-]?)\s+(?P<body>.+)$"
)


@dataclass(slots=True)
class ExtractedClause:
    order_index: int
    label: str | None
    text: str


def extract_clauses(contract_text: str) -> list[ExtractedClause]:
    normalized_text = contract_text.strip()
    if not normalized_text:
        return []

    numbered_clauses = _extract_numbered_clauses(normalized_text)
    if numbered_clauses:
        return numbered_clauses

    return _extract_paragraph_clauses(normalized_text)


def _extract_numbered_clauses(contract_text: str) -> list[ExtractedClause]:
    clauses: list[ExtractedClause] = []
    preamble_parts: list[str] = []
    current_label: str | None = None
    current_parts: list[str] = []
    saw_clause_start = False

    for raw_line in contract_text.splitlines():
        line = raw_line.strip()
        if not line:
            if saw_clause_start and current_parts and current_parts[-1] != "":
                current_parts.append("")
            elif not saw_clause_start and preamble_parts and preamble_parts[-1] != "":
                preamble_parts.append("")
            continue

        clause_start = CLAUSE_START_RE.match(line)
        if clause_start:
            saw_clause_start = True

            if not clauses and preamble_parts:
                preamble_text = _join_parts(preamble_parts)
                if preamble_text:
                    clauses.append(
                        ExtractedClause(
                            order_index=1,
                            label=None,
                            text=preamble_text,
                        )
                    )

            if current_parts:
                clauses.append(
                    ExtractedClause(
                        order_index=len(clauses) + 1,
                        label=current_label,
                        text=_join_parts(current_parts),
                    )
                )

            current_label = clause_start.group("label").rstrip(".-)")
            current_parts = [clause_start.group("body").strip()]
            continue

        if saw_clause_start:
            current_parts.append(line)
        else:
            preamble_parts.append(line)

    if current_parts:
        clauses.append(
            ExtractedClause(
                order_index=len(clauses) + 1,
                label=current_label,
                text=_join_parts(current_parts),
            )
        )

    return [clause for clause in clauses if clause.text]


def _extract_paragraph_clauses(contract_text: str) -> list[ExtractedClause]:
    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n{2,}", contract_text)
        if paragraph.strip()
    ]

    if not paragraphs:
        return []

    return [
        ExtractedClause(order_index=index, label=None, text=paragraph)
        for index, paragraph in enumerate(paragraphs, start=1)
    ]


def _join_parts(parts: list[str]) -> str:
    text = "\n".join(parts)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
