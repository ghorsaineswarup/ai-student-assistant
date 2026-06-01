from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from pdf_extractor import extract_text_from_pdf
from dotenv import load_dotenv
import os

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

class ChatRequest(BaseModel):
    session_id: str
    question: str

class ActionRequest(BaseModel):
    session_id: str
    count: int = 5

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    if file.filename.endswith(".pdf"):
        text = extract_text_from_pdf(contents)
    else:
        text = contents.decode("utf-8")
    session_id = file.filename.replace(" ", "_")
    stored_text[session_id] = text
    return {"session_id": session_id, "message": "File uploaded successfully", "preview": text[:300]}

@app.post("/chat")
async def chat(req: ChatRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"answer": "No notes found. Please upload a file first."}
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": f"You are a helpful study assistant. Answer questions based on these notes:\n\n{notes}"},
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
            {"role": "system", "content": "You are a study assistant. Summarize the following notes clearly and concisely with key points, main ideas, and important details."},
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
            {"role": "system", "content": f"Generate exactly {req.count} multiple choice questions from these notes. Format each as:\nQ: question\nA) option\nB) option\nC) option\nD) option\nAnswer: X\n\nSeparate each question with a blank line."},
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
            {"role": "system", "content": f"Create exactly {req.count} flashcards from these notes. Format each as:\nFront: question\nBack: answer\n---"},
            {"role": "user", "content": notes}
        ]
    )
    return {"flashcards": response.choices[0].message.content}

@app.get("/")
def root():
    return {"message": "AI Student Assistant API is running"}