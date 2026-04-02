# Explain My Bill

A web app that translates confusing bills into plain English. Upload a medical, insurance, utility, or legal bill and get each line item explained in clear language with suspicious charges flagged.

---

## Tech Stack

- **Backend**: Python, FastAPI, LangChain, OpenAI GPT-4o
- **Frontend**: React, Vite, Tailwind CSS
- **Document Processing**: PyPDF2, pypdf, Pillow (image OCR via GPT-4o vision)
- **Chat**: LangChain conversation memory

---

## Features (updating...)

- **Document Upload & Text Extraction**
  - Accepts PDF, images (PNG, JPG, WEBP), and plain text input
  - Uses GPT-4o vision for image OCR when needed

- **Bill Classification & Routing**
  - Automatically classifies bills as medical, insurance, utility, legal, or other
  - Routes to specialist prompts for domain-specific explanations

- **Plain English Translation**
  - Breaks down each line item into simple sentences
  - Provides a short summary of the full bill

- **Suspicious Item Detection**
  - Flags duplicate charges
  - Flags vague descriptions (misc, adjustment, service charge)
  - Flags high amounts that warrant verification
  - Flags unexplained medical billing codes

- **Dispute Letter Generation**
  - Auto-generates professional dispute letters when flagged items exist
  - References specific charges by name

- **Follow-up Chat**
  - Allows users to ask questions about their analyzed bill
  - Maintains conversation context across messages

---

## What I Learned From This Project

- **LangChain LLM Pipelines**
  - Built multi-step chains with classification, routing, explanation, and flagging stages
  - Used PydanticOutputParser for structured JSON responses from LLMs

- **Multi-format Document Processing**
  - Handled PDF text extraction with fallback logic for encrypted files
  - Used vision LLM for extracting text from bill images

- **Specialized Prompt Engineering**
  - Created domain-specific system prompts for medical, insurance, utility, and legal bills
  - Learned to frame prompts so the LLM returns structured, actionable output

- **Heuristic + LLM Flagging**
  - Combined rule-based scanning with LLM analysis for comprehensive bill review
  - Deduplicated flagged findings to avoid redundant alerts

- **React State & API Integration**
  - Managed multi-stage async analysis with progress indicators
  - Built chat interface with conversation memory on the backend

---

## Running the Project

### To run the project locally, follow these steps:

1. Clone the repo (`git clone <url>`)

2. **Set up the backend:**
   ```
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Create a `.env` file in the backend folder:**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the backend server:**
   ```
   python -m backend.main
   ```
   The API runs at `http://localhost:8000`

5. **Set up and run the frontend:**
   ```
   cd frontend
   npm install
   npm run dev
   ```
   The frontend runs at `http://localhost:5173`

6. Open `http://localhost:5173` in your browser, upload a bill, and see it explained.