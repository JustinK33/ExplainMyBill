from __future__ import annotations

from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from .explainer import BillExplanation, BillLineItem
from .flag_agent import FlaggedItem


class OutputLineItem(BaseModel):
    label: str
    original_text: str
    plain_english: str
    flagged: bool
    flag_reason: str | None = None


class FinalBillResponse(BaseModel):
    summary: str
    line_items: list[OutputLineItem]
    dispute_letter: str | None = None


def _generate_dispute_letter(summary: str, flagged_items: list[FlaggedItem]) -> str:
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You draft concise, professional dispute letters. Address the letter generically to To Whom It May Concern. "
                "Reference the flagged charges by name, ask for itemized clarification, and keep the tone respectful.",
            ),
            (
                "human",
                "Bill summary:\n{summary}\n\nFlagged items:\n{flagged_items}\n\nWrite the dispute letter only.",
            ),
        ]
    )
    chain = prompt | llm
    response = chain.invoke(
        {
            "summary": summary,
            "flagged_items": "\n".join(f"- {item.label}: {item.reason}" for item in flagged_items),
        }
    )
    return str(response.content).strip()


def build_final_response(explanation: BillExplanation, flagged_items: list[FlaggedItem]) -> FinalBillResponse:
    flagged_lookup = {item.label: item.reason for item in flagged_items}
    output_line_items: list[OutputLineItem] = []

    for item in explanation.line_items:
        flag_reason = flagged_lookup.get(item.label)
        output_line_items.append(
            OutputLineItem(
                label=item.label,
                original_text=item.original_text,
                plain_english=item.plain_english,
                flagged=flag_reason is not None,
                flag_reason=flag_reason,
            )
        )

    dispute_letter = _generate_dispute_letter(explanation.summary, flagged_items) if flagged_items else None
    return FinalBillResponse(
        summary=explanation.summary,
        line_items=output_line_items,
        dispute_letter=dispute_letter,
    )
