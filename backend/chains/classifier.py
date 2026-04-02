from __future__ import annotations

from enum import Enum

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field


class BillClassification(BaseModel):
    bill_type: str = Field(description='One of: medical, insurance, utility, legal, other')


def _classifier_parser() -> PydanticOutputParser:
    return PydanticOutputParser(pydantic_object=BillClassification)


def classify_bill_type(raw_text: str) -> BillClassification:
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = _classifier_parser()
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You classify confusing bills. Read the text and decide the bill type. "
                "Valid values are medical, insurance, utility, legal, or other. "
                "Return only the structured output.",
            ),
            (
                "human",
                "Bill text:\n{bill_text}\n\n{format_instructions}",
            ),
        ]
    ).partial(format_instructions=parser.get_format_instructions())

    chain = prompt | llm | parser
    classification = chain.invoke({"bill_text": raw_text})
    if classification.bill_type not in {"medical", "insurance", "utility", "legal", "other"}:
        return BillClassification(bill_type="other")
    return classification
