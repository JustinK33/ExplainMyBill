from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict

try:
    from langchain.chains.router.llm_router import LLMRouterChain  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - compatibility fallback for LangChain packaging changes
    try:
        from langchain_classic.chains.router.llm_router import LLMRouterChain  # type: ignore[import-not-found]
    except ImportError:
        LLMRouterChain = None

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from .explainer import SPECIALIST_INSTRUCTIONS

ROUTE_NAMES = {
    "medical": "medical",
    "insurance": "insurance",
    "utility": "utility",
    "legal": "legal",
}


ROUTER_TEMPLATE = PromptTemplate.from_template(
    """You are routing a bill to the best specialist prompt.
Choose one destination from medical, insurance, utility, legal, or other.
Use the bill type hint when it is available.

Bill type hint: {bill_type}
Bill text:
{bill_text}

Return a destination name and a brief rationale.
"""
)


@dataclass
class RoutedTemplate:
    bill_type: str
    instructions: str


SPECIALIST_TEMPLATES: Dict[str, RoutedTemplate] = {
    bill_type: RoutedTemplate(bill_type=bill_type, instructions=instructions)
    for bill_type, instructions in SPECIALIST_INSTRUCTIONS.items()
}

logger = logging.getLogger(__name__)


def build_router_chain() -> Any | None:
    if LLMRouterChain is None:
        return None

    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    try:
        return LLMRouterChain.from_llm(llm, ROUTER_TEMPLATE)
    except Exception as exc:
        # LangChain router internals can vary across versions; fallback to classification-only routing.
        logger.warning(
            "Router chain initialization failed; using classification-only routing: %s",
            exc,
        )
        return None


def route_bill_type(bill_type: str) -> RoutedTemplate:
    return SPECIALIST_TEMPLATES.get(bill_type, SPECIALIST_TEMPLATES["other"])
