from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field

from .explainer import BillExplanation


class FlaggedItem(BaseModel):
    label: str
    reason: str


@dataclass
class _HeuristicFinding:
    label: str
    reason: str


def _normalize_label(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _parse_amounts(text: str) -> list[float]:
    amounts = []
    for match in re.findall(r"\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)", text):
        try:
            amounts.append(float(match.replace(",", "")))
        except ValueError:
            continue
    return amounts


def _heuristic_scan(payload: str) -> str:
    data = json.loads(payload)
    raw_text = data.get("raw_text", "")
    line_items = data.get("line_items", [])

    findings: list[_HeuristicFinding] = []
    seen_labels: dict[str, int] = {}
    amounts = _parse_amounts(raw_text)
    high_amount_threshold = 500.0 if amounts and max(amounts) < 1000 else 1000.0

    for item in line_items:
        label = item.get("label") or item.get("original_text") or "Line item"
        original_text = item.get("original_text", "")
        normalized = _normalize_label(original_text or label)
        seen_labels[normalized] = seen_labels.get(normalized, 0) + 1

    for item in line_items:
        label = item.get("label") or item.get("original_text") or "Line item"
        original_text = item.get("original_text", "")
        plain_english = item.get("plain_english", "")
        normalized = _normalize_label(original_text or label)

        if seen_labels.get(normalized, 0) > 1:
            findings.append(
                _HeuristicFinding(
                    label=label,
                    reason="This line appears more than once, so it may be a duplicate charge.",
                )
            )

        if len(original_text) < 8 or re.search(r"\b(misc|adjustment|fee|service charge|other)\b", original_text, re.I):
            findings.append(
                _HeuristicFinding(
                    label=label,
                    reason="The description is vague or generic, which makes the charge hard to verify.",
                )
            )

        if any(amount >= high_amount_threshold for amount in _parse_amounts(original_text)) or any(
            amount >= high_amount_threshold for amount in _parse_amounts(plain_english)
        ):
            findings.append(
                _HeuristicFinding(
                    label=label,
                    reason="The amount looks unusually high and should be confirmed against the underlying service.",
                )
            )

        if re.search(r"\b(CPT|HCPCS|ICD-10|proc|code)\b", original_text, re.I) and not re.search(
            r"\b(code|procedure|service|diagnosis)\b", plain_english, re.I
        ):
            findings.append(
                _HeuristicFinding(
                    label=label,
                    reason="A billing code appears in the line, but the description does not clearly match the service.",
                )
            )

    unique_findings: list[FlaggedItem] = []
    seen = set()
    for finding in findings:
        key = (finding.label, finding.reason)
        if key in seen:
            continue
        seen.add(key)
        unique_findings.append(FlaggedItem(label=finding.label, reason=finding.reason))

    return json.dumps([finding.model_dump() for finding in unique_findings], ensure_ascii=False)


def review_for_flags(raw_text: str, explanation: BillExplanation) -> list[FlaggedItem]:
    payload = json.dumps(
        {
            "raw_text": raw_text,
            "line_items": [item.model_dump() for item in explanation.line_items],
        },
        ensure_ascii=False,
    )
    output = _heuristic_scan(payload)
    return _parse_flagged_items(output)


def _parse_flagged_items(output_text: str) -> list[FlaggedItem]:
    try:
        cleaned = output_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start != -1 and end != -1:
            cleaned = cleaned[start : end + 1]
        payload = json.loads(cleaned)
        return [FlaggedItem.model_validate(item) for item in payload]
    except Exception:
        return []
