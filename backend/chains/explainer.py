from __future__ import annotations

from typing import Literal

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field


class BillLineItem(BaseModel):
    label: str
    original_text: str
    plain_english: str


class BillExplanation(BaseModel):
    summary: str
    line_items: list[BillLineItem]


SPECIALIST_INSTRUCTIONS = {
    "medical": (
        "You are a medical billing expert. Explain CPT codes, EOB terminology, insurance jargon, "
        "co-pays, deductibles, coinsurance, denied claims, and patient responsibility."
    ),
    "insurance": (
        "You are an insurance billing expert. Explain policy terms, premiums, exclusions, coverage limits, "
        "deductibles, member responsibilities, and claim adjustments."
    ),
    "utility": (
        "You are a utility billing expert. Explain rate tiers, kilowatt-hour pricing, delivery charges, "
        "usage fees, taxes, surcharges, and billing periods."
    ),
    "legal": (
        "You are a legal billing expert. Explain contract clauses, retainers, billable hours, legal tasks, "
        "administrative fees, and time entries in plain English."
    ),
    "other": (
        "You are a billing expert. Explain the bill line by line in plain English for a non-expert."
    ),
}


def _explainer_prompt(bill_type: str) -> ChatPromptTemplate:
    parser = PydanticOutputParser(pydantic_object=BillExplanation)
    instructions = SPECIALIST_INSTRUCTIONS.get(bill_type, SPECIALIST_INSTRUCTIONS["other"])
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "{instructions} Go line by line. Each line item must be translated into one simple sentence. "
                "Keep the summary short and helpful. If the text contains headers or totals, include them only when they are meaningful. "
                "Return structured JSON only.",
            ),
            (
                "human",
                "Bill type: {bill_type}\n\nBill text:\n{bill_text}\n\n{format_instructions}",
            ),
        ]
    ).partial(
        instructions=instructions,
        format_instructions=parser.get_format_instructions(),
    )
    return prompt


def explain_bill(raw_text: str, bill_type: str) -> BillExplanation:
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=BillExplanation)
    prompt = _explainer_prompt(bill_type)
    chain = prompt | llm | parser
    result = chain.invoke({"bill_text": raw_text, "bill_type": bill_type})
    return result
