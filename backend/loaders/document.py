from __future__ import annotations

import base64
import mimetypes
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from PIL import Image
from PyPDF2 import PdfReader

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PDF_EXTENSIONS = {".pdf"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


async def extract_text_from_input(file: UploadFile | None = None, text: str | None = None) -> str:
    if text and text.strip():
        return text.strip()

    if file is None:
        raise HTTPException(status_code=400, detail="Please upload a PDF, image, or paste the bill text.")

    filename = file.filename or "upload"
    suffix = Path(filename).suffix.lower()
    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="The uploaded file is larger than 10 MB. Please upload a smaller file.")

    if suffix in PDF_EXTENSIONS or (file.content_type or "").lower() == "application/pdf":
        return _extract_pdf_text(contents, suffix or ".pdf")

    if suffix in IMAGE_EXTENSIONS or (file.content_type or "").startswith("image/"):
        return await _extract_image_text(contents, file.content_type or mimetypes.guess_type(filename)[0] or "image/png")

    if suffix in {".txt", ".md", ".csv"} or (file.content_type or "").startswith("text/"):
        return contents.decode("utf-8", errors="ignore").strip()

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Please upload a PDF, PNG, JPG, JPEG, WEBP, or plain text file.",
    )


def _extract_pdf_text(contents: bytes, suffix: str) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(contents)
        temp_path = Path(temp_file.name)

    try:
        loader = PyPDFLoader(str(temp_path))
        documents = loader.load()
        combined_text = "\n".join(document.page_content for document in documents if document.page_content)
        if combined_text.strip():
            return combined_text.strip()

        reader = PdfReader(str(temp_path))
        fallback_text = "\n".join((page.extract_text() or "") for page in reader.pages)
        return fallback_text.strip()
    finally:
        temp_path.unlink(missing_ok=True)


async def _extract_image_text(contents: bytes, mime_type: str) -> str:
    encoded_image = base64.b64encode(contents).decode("utf-8")
    vision_llm = ChatOpenAI(model="gpt-4o", temperature=0)
    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": (
                    "Extract every readable word from this bill image. Preserve line breaks and labels. "
                    "Do not explain the bill yet. Only return the raw extracted text."
                ),
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{encoded_image}",
                },
            },
        ]
    )
    response = vision_llm.invoke([message])
    return str(response.content).strip()
