from __future__ import annotations

import hashlib
import os
from collections import OrderedDict, defaultdict
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from openai import APIConnectionError, AuthenticationError, OpenAIError

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

try:
    from langchain_classic.memory import ConversationBufferMemory  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - compatibility fallback
    from langchain.memory import ConversationBufferMemory  # type: ignore[import-not-found]

from backend.chains.classifier import classify_bill_type
from backend.chains.explainer import explain_bill
from backend.chains.flag_agent import review_for_flags
from backend.chains.output import FinalBillResponse, build_final_response
from backend.chains.router import build_router_chain, route_bill_type
from backend.loaders.document import extract_text_from_input

app = FastAPI(title="Explain My Bill", version="1.0.0")

DEFAULT_ALLOWED_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
MAX_ANALYZE_TEXT_CHARS = 120_000


def _allowed_origins() -> list[str]:
    configured_origins = os.getenv("ALLOWED_ORIGINS")
    if not configured_origins:
        return list(DEFAULT_ALLOWED_ORIGINS)

    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

MAX_CHAT_CONTEXT_CHARS = 50000
MAX_CHAT_MESSAGE_CHARS = 1000
MAX_CONVERSATIONS = 100
MAX_CHAT_MESSAGES = 12


class AnalyzeResponse(FinalBillResponse):
    pass


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_CHAT_MESSAGE_CHARS)
    bill_context: str = Field(min_length=1, max_length=MAX_CHAT_CONTEXT_CHARS)


class ChatResponse(BaseModel):
    answer: str


conversation_store: dict[str, ConversationBufferMemory] = defaultdict(
    lambda: ConversationBufferMemory(return_messages=True)
)
conversation_order: OrderedDict[str, None] = OrderedDict()


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(_, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    return JSONResponse(
        status_code=500,
        content={"detail": "Unexpected backend error."},
    )


def _ensure_openai_config() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the backend. Set it and try again.",
        )


def _context_key(bill_context: str) -> str:
    return hashlib.sha256(bill_context.encode("utf-8")).hexdigest()


def _build_chat_prompt(bill_context: str, message: str, history: list[Any]) -> list[dict[str, str]]:
    prompt: list[dict[str, str]] = [
        {
            "role": "system",
            "content": (
                "You answer follow-up questions about a previously analyzed bill. "
                "Use the bill context and prior conversation to answer clearly and briefly. "
                "If the user asks about a line item, refer to the line items and explain in plain English. "
                "Do not invent facts that are not supported by the bill context."
            ),
        },
        {
            "role": "system",
            "content": f"Bill context:\n{bill_context}",
        },
    ]

    for item in history[-MAX_CHAT_MESSAGES:]:
        role = getattr(item, "type", None)
        content = getattr(item, "content", "")
        if role == "human":
            prompt.append({"role": "user", "content": str(content)})
        elif role == "ai":
            prompt.append({"role": "assistant", "content": str(content)})

    prompt.append({"role": "user", "content": message})
    return prompt


def _touch_conversation(context_key: str) -> None:
    conversation_order.pop(context_key, None)
    conversation_order[context_key] = None

    while len(conversation_order) > MAX_CONVERSATIONS:
        oldest_key, _ = conversation_order.popitem(last=False)
        conversation_store.pop(oldest_key, None)


def _trim_memory(memory: ConversationBufferMemory) -> None:
    messages = getattr(memory.chat_memory, "messages", None)
    if messages is None or len(messages) <= MAX_CHAT_MESSAGES:
        return

    memory.chat_memory.messages = messages[-MAX_CHAT_MESSAGES:]


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_bill(file: UploadFile | None = File(default=None), text: str | None = Form(default=None)):
    try:
        _ensure_openai_config()
        raw_text = await extract_text_from_input(file=file, text=text)

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="We could not read any text from the uploaded bill.")
        if len(raw_text) > MAX_ANALYZE_TEXT_CHARS:
            raise HTTPException(
                status_code=413,
                detail="The extracted bill text is too large to analyze safely. Please upload fewer pages or paste a smaller section.",
            )

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
            detail="The AI service returned an error while analyzing the bill. Please try again.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unexpected backend error while analyzing the bill.",
        ) from exc
    finally:
        if file is not None:
            await file.close()


@app.post("/chat", response_model=ChatResponse)
async def chat_with_bill(payload: ChatRequest):
    try:
        _ensure_openai_config()
        context_key = _context_key(payload.bill_context)
        memory = conversation_store[context_key]
        _touch_conversation(context_key)

        history = list(memory.buffer_as_messages)
        llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0)
        prompt = _build_chat_prompt(payload.bill_context, payload.message, history)
        response = llm.invoke(prompt)
        answer = str(response.content).strip()
        if not answer:
            raise HTTPException(status_code=502, detail="The AI service returned an empty chat response.")

        memory.chat_memory.add_user_message(payload.message)
        memory.chat_memory.add_ai_message(answer)
        _trim_memory(memory)
        return ChatResponse(answer=answer)
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
            detail="The AI service returned an error while answering the question. Please try again.",
        ) from exc


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
