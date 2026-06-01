from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os, sys, tempfile

sys.path.append(os.path.dirname(__file__))
from pdf_extractor import extract_text_from_pdf

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

stored_text = {}

LANGUAGE_INSTRUCTION = """
You can detect and respond in the user's language automatically.
Supported languages: Nepali, Hindi, English, Spanish, French, German,
Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Turkish,
Dutch, Polish, Swedish, Norwegian, Danish, Finnish, Bengali, Urdu,
Tagalog, Cebuano, Visayan, Malay, Indonesian, Vietnamese, Thai, Swahili.

Rules:
- Detect the language of the user's message automatically
- Respond in that exact same language always
- If the user writes in Nepali → respond in Nepali
- If the user writes in Tagalog → respond in Tagalog
- If the user writes in Cebuano → respond in Cebuano
- If the user writes in Visayan → respond in Visayan
- If the user writes in Hindi → respond in Hindi
- If notes are in a different language than the question, still answer in the question's language
- For quiz and flashcards, use the same language as the notes
- Never mix languages in one response
"""

class ChatRequest(BaseModel):
    session_id: str
    question: str

class ActionRequest(BaseModel):
    session_id: str
    count: int = 5
    language: str = "auto"

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(contents)
        elif filename.endswith(".docx"):
            import docx2txt
            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as f:
                f.write(contents)
                tmp = f.name
            text = docx2txt.process(tmp)
            os.unlink(tmp)
        elif filename.endswith(".pptx"):
            from pptx import Presentation
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pptx") as f:
                f.write(contents)
                tmp = f.name
            prs = Presentation(tmp)
            text = "\n".join([
                shape.text
                for slide in prs.slides
                for shape in slide.shapes
                if hasattr(shape, "text")
            ])
            os.unlink(tmp)
        elif filename.endswith(".csv"):
            text = contents.decode("utf-8")
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            text = f"[Image uploaded: {file.filename}]"
        else:
            text = contents.decode("utf-8")
    except Exception:
        text = contents.decode("utf-8", errors="ignore")

    session_id = file.filename.replace(" ", "_")
    stored_text[session_id] = text
    return {
        "session_id": session_id,
        "message": "File uploaded successfully",
        "preview": text[:300]
    }

@app.post("/chat")
async def chat(req: ChatRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"answer": "No notes found. Please upload a file first."}
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}

You are a helpful study assistant. Answer questions based on these notes:

{notes}

Important: Detect the language of the user's question and respond in that exact same language."""},
            {"role": "user", "content": req.question}
        ]
    )
    return {"answer": response.choices[0].message.content}

@app.post("/summarize")
async def summarize(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"summary": "No notes found."}
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}

You are a study assistant. Summarize the following notes clearly with key points and main ideas.

Important: Detect the language of the notes and summarize in that same language. If notes are in English, summarize in English. If in Nepali, summarize in Nepali. If mixed, use English."""},
            {"role": "user", "content": notes}
        ]
    )
    return {"summary": response.choices[0].message.content}

@app.post("/quiz")
async def generate_quiz(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"quiz": "No notes found."}
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}

Generate exactly {req.count} multiple choice questions from these notes.
Format each as:
Q: question
A) option
B) option
C) option
D) option
Answer: X

Separate each question with a blank line.

Important: Generate the quiz in the same language as the notes. If notes are in Nepali, make the quiz in Nepali. If in Tagalog, make it in Tagalog. If in English, make it in English."""},
            {"role": "user", "content": notes}
        ]
    )
    return {"quiz": response.choices[0].message.content}

@app.post("/flashcards")
async def generate_flashcards(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"flashcards": "No notes found."}
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}

Create exactly {req.count} flashcards from these notes.
Format each as:
Front: question
Back: answer
---

Important: Create flashcards in the same language as the notes. If notes are in Nepali, make flashcards in Nepali. If in Cebuano, make them in Cebuano. If in English, make them in English."""},
            {"role": "user", "content": notes}
        ]
    )
    return {"flashcards": response.choices[0].message.content}

@app.get("/")
def root():
    return {"message": "AI Student Assistant API is running"}