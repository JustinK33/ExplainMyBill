from __future__ import annotations

import hashlib
import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Dict

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from openai import APIConnectionError, AuthenticationError, OpenAIError

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

try:
    from langchain_classic.memory import ConversationBufferMemory  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - compatibility fallback
    from langchain.memory import ConversationBufferMemory  # type: ignore[import-not-found]

from backend.chains.classifier import BillClassification, classify_bill_type
from backend.chains.explainer import BillExplanation, explain_bill
from backend.chains.flag_agent import FlaggedItem, review_for_flags
from backend.chains.output import FinalBillResponse, build_final_response
from backend.chains.router import build_router_chain, route_bill_type
from backend.loaders.document import extract_text_from_input

app = FastAPI(title="Explain My Bill", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


class AnalyzeResponse(FinalBillResponse):
    pass


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    bill_context: str = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str


conversation_store: Dict[str, ConversationBufferMemory] = defaultdict(
    lambda: ConversationBufferMemory(return_messages=True)
)


def _ensure_openai_config() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the backend. Set it and try again.",
        )


def _context_key(bill_context: str) -> str:
    return hashlib.sha256(bill_context.encode("utf-8")).hexdigest()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_bill(file: UploadFile | None = File(default=None), text: str | None = Form(default=None)):
    try:
        _ensure_openai_config()
        raw_text = await extract_text_from_input(file=file, text=text)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="We could not read any text from the uploaded bill.")

        classification = classify_bill_type(raw_text)
        router_chain = build_router_chain()
        routed_bill_type = classification.bill_type
        if router_chain is not None:
            router_result = router_chain.invoke({"bill_text": raw_text, "bill_type": classification.bill_type})
            if isinstance(router_result, dict):
                routed_bill_type = router_result.get("destination") or router_result.get("next_inputs", {}).get("bill_type") or routed_bill_type

        routed = route_bill_type(routed_bill_type)
        explanation = explain_bill(raw_text, routed.bill_type)
        flagged_items = review_for_flags(raw_text, explanation)
        final_response = build_final_response(explanation, flagged_items)
        return final_response
    except HTTPException:
        raise
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=503,
            detail="The backend could not authenticate with OpenAI. Check the API key and restart the backend.",
        ) from exc
    except APIConnectionError as exc:
        raise HTTPException(
            status_code=503,
            detail="The backend could not reach OpenAI. Check your internet connection and try again.",
        ) from exc
    except OpenAIError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI returned an error while analyzing the bill: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected backend error while analyzing the bill: {exc}",
        ) from exc


@app.post("/chat", response_model=ChatResponse)
async def chat_with_bill(payload: ChatRequest):
    _ensure_openai_config()
    context_key = _context_key(payload.bill_context)
    memory = conversation_store[context_key]
    memory.chat_memory.add_user_message(payload.message)

    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    history = memory.buffer_as_messages
    prompt = [
        {
            "role": "system",
            "content": (
                "You answer follow-up questions about a previously analyzed bill. "
                "Use the bill context and prior conversation to answer clearly and briefly. "
                "If the user asks about a line item, refer to the line items and explain in plain English."
            ),
        },
        {
            "role": "user",
            "content": f"Bill context:\n{payload.bill_context}\n\nUser question: {payload.message}",
        },
    ]
    response = llm.invoke(prompt)
    answer = str(response.content).strip()
    memory.chat_memory.add_ai_message(answer)
    return ChatResponse(answer=answer)


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
