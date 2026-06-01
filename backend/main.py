from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import os, tempfile, logging, time

from pdf_extractor import extract_text_from_pdf
from database import get_db, ChatHistory, SavedContent
from auth import (
    authenticate_user, create_access_token, create_user, 
    get_user_by_email, get_user_by_username, SECRET_KEY, ALGORITHM
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ai-student-assistant-tau.vercel.app", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

stored_text = {}
MAX_NOTES_LENGTH = 45000

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

LANGUAGE_INSTRUCTION = """
CRITICAL: ALWAYS respond in English. NEVER respond in Nepali, Hindi, or any other language.
The user wants English output only.

Rules:
- ALWAYS use English
- NEVER translate to other languages
- If notes are in Nepali, translate them to English first
- If notes are in Hindi, translate them to English first
- All output must be pure English
"""

SUPPORTED_LANGUAGES = [
    "English", "Mandarin Chinese", "Spanish", "Hindi", "Arabic",
    "French", "Bengali", "Portuguese", "Russian", "Urdu",
    "Indonesian", "German", "Japanese", "Swahili", "Marathi",
    "Telugu", "Turkish", "Tamil", "Vietnamese", "Korean",
    "Italian", "Thai", "Gujarati", "Polish", "Ukrainian",
    "Malayalam", "Kannada", "Oriya", "Punjabi", "Persian",
    "Nepali", "Tagalog", "Cebuano", "Bisaya"
]

# ========== PYDANTIC MODELS ==========

class ChatRequest(BaseModel):
    session_id: str
    question: str

class ActionRequest(BaseModel):
    session_id: str
    count: int = 5
    language: str = "en"

class CompareRequest(BaseModel):
    session_id_1: str
    session_id_2: str

class EssayRequest(BaseModel):
    session_id: str
    essay_text: str

class HomeworkRequest(BaseModel):
    session_id: str
    question: str
    subject: str = "general"

class ELI5Request(BaseModel):
    session_id: str
    topic: str

class DebateRequest(BaseModel):
    session_id: str
    topic: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SaveContentRequest(BaseModel):
    type: str
    title: str
    content: str
    session_id: str

# ========== AUTH DEPENDENCIES ==========

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

# ========== HEALTH & ROOT ==========

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time(), "service": "AI Student Assistant"}

@app.get("/")
def root():
    return {
        "message": "AI Student Assistant API",
        "version": "2.1",
        "features": [
            "upload", "chat", "summarize", "quiz", "flashcards",
            "exam_predictor", "study_plan", "key_terms", "mind_map",
            "eli5", "compare", "essay_grade", "homework_help",
            "formula_sheet", "chapter_summary", "simplify_words",
            "fill_blanks", "true_false", "short_answer", "debate",
            "auth", "save_content", "chat_history"
        ],
        "languages": SUPPORTED_LANGUAGES,
        "health": "/health"
    }

# ========== AUTH ENDPOINTS ==========

@app.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    db_user = create_user(db, user.username, user.email, user.password)
    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
def read_users_me(current_user = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "email": current_user.email}

# ========== UPLOAD ==========

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    logger.info(f"Uploading: {file.filename}")
    contents = await file.read()
    filename = file.filename.lower()
    
    if len(contents) > 10 * 1024 * 1024:
        return {"error": "File too large. Max 10MB."}

    try:
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(contents)
        elif filename.endswith(".docx"):
            import docx2txt
            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as f:
                f.write(contents); tmp = f.name
            text = docx2txt.process(tmp)
            os.unlink(tmp)
        elif filename.endswith(".pptx"):
            from pptx import Presentation
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pptx") as f:
                f.write(contents); tmp = f.name
            prs = Presentation(tmp)
            text = "\n".join([shape.text for slide in prs.slides for shape in slide.shapes if hasattr(shape, "text")])
            os.unlink(tmp)
        elif filename.endswith(".csv"):
            text = contents.decode("utf-8")
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            text = f"[Image uploaded: {file.filename}]"
        else:
            text = contents.decode("utf-8")
    except Exception as e:
        logger.error(f"Extract error: {e}")
        text = contents.decode("utf-8", errors="ignore")

    if len(text) > MAX_NOTES_LENGTH:
        text = text[:MAX_NOTES_LENGTH] + "\n\n[Note: Content truncated due to length]"

    session_id = file.filename.replace(" ", "_")
    stored_text[session_id] = text
    logger.info(f"Stored: {session_id} ({len(text)} chars)")
    
    return {
        "session_id": session_id,
        "message": "File uploaded successfully",
        "preview": text[:300]
    }

# ========== CHAT HISTORY ==========

@app.post("/chat")
async def chat(req: ChatRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"answer": "No notes found. Please upload a file first."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
You are a helpful study assistant. Answer questions based on these notes:

{notes}

CRITICAL: ALWAYS respond in English only."""},
                {"role": "user", "content": req.question}
            ],
            timeout=30, max_tokens=2000
        )
        answer = response.choices[0].message.content
        
        # Save to chat history
        existing = db.query(ChatHistory).filter(
            ChatHistory.user_id == current_user.id,
            ChatHistory.session_id == req.session_id
        ).first()
        
        if existing:
            import json
            messages = json.loads(existing.messages)
            messages.append({"role": "user", "text": req.question})
            messages.append({"role": "assistant", "text": answer})
            existing.messages = json.dumps(messages)
        else:
            import json
            messages = [
                {"role": "assistant", "text": "Chat started! Ask me anything about your notes."},
                {"role": "user", "text": req.question},
                {"role": "assistant", "text": answer}
            ]
            db.add(ChatHistory(
                user_id=current_user.id,
                session_id=req.session_id,
                title=f"Chat: {req.session_id[:20]}",
                messages=json.dumps(messages)
            ))
        db.commit()
        
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"answer": f"Error: {str(e)}. Please try again."}

@app.get("/chat_history")
def get_chat_history(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    import json
    history = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).all()
    return [
        {
            "id": h.id,
            "session_id": h.session_id,
            "title": h.title,
            "messages": json.loads(h.messages),
            "created_at": h.created_at.isoformat()
        }
        for h in history
    ]

# ========== SAVE CONTENT ==========

@app.post("/save")
def save_content(req: SaveContentRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db_content = SavedContent(
        user_id=current_user.id,
        type=req.type,
        title=req.title,
        content=req.content,
        session_id=req.session_id
    )
    db.add(db_content)
    db.commit()
    db.refresh(db_content)
    return {"id": db_content.id, "message": "Saved successfully"}

@app.get("/saved")
def get_saved_content(type: str = None, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(SavedContent).filter(SavedContent.user_id == current_user.id)
    if type:
        query = query.filter(SavedContent.type == type)
    items = query.order_by(SavedContent.created_at.desc()).all()
    return [
        {
            "id": item.id,
            "type": item.type,
            "title": item.title,
            "content": item.content,
            "session_id": item.session_id,
            "created_at": item.created_at.isoformat()
        }
        for item in items
    ]

@app.delete("/saved/{item_id}")
def delete_saved(item_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(SavedContent).filter(SavedContent.id == item_id, SavedContent.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Deleted successfully"}

# ========== ALL AI FEATURES (Same as before, with auth added) ==========

@app.post("/summarize")
async def summarize(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"summary": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Summarize the following notes clearly with key points and main ideas. ALWAYS in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=30, max_tokens=2000
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        return {"summary": f"Error: {str(e)}. Please try again."}

@app.post("/quiz")
async def generate_quiz(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"quiz": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Generate exactly {req.count} multiple choice questions in English.
Format: Q: question / A) B) C) D) / Answer: X"""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"quiz": response.choices[0].message.content}
    except Exception as e:
        return {"quiz": f"Error: {str(e)}. Please try again."}

@app.post("/flashcards")
async def generate_flashcards(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"flashcards": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create exactly {req.count} flashcards in English.
Format: Front: question / Back: answer / ---"""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"flashcards": response.choices[0].message.content}
    except Exception as e:
        return {"flashcards": f"Error: {str(e)}. Please try again."}

# Add all other endpoints (exam_predictor, study_plan, etc.) with current_user = Depends(get_current_user)
# ... (same pattern as above)

@app.post("/exam_predictor")
async def exam_predictor(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"exam_predictor": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Predict {req.count} exam questions in English with likelihood and reasons."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"exam_predictor": response.choices[0].message.content}
    except Exception as e:
        return {"exam_predictor": f"Error: {str(e)}"}

@app.post("/study_plan")
async def study_plan(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"study_plan": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create a 7-day study plan in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"study_plan": response.choices[0].message.content}
    except Exception as e:
        return {"study_plan": f"Error: {str(e)}"}

@app.post("/key_terms")
async def key_terms(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"key_terms": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Extract {req.count} key terms and definitions in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"key_terms": response.choices[0].message.content}
    except Exception as e:
        return {"key_terms": f"Error: {str(e)}"}

@app.post("/mind_map")
async def mind_map(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"mind_map": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create a text-based mind map in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"mind_map": response.choices[0].message.content}
    except Exception as e:
        return {"mind_map": f"Error: {str(e)}"}

@app.post("/eli5")
async def eli5(req: ELI5Request, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"eli5": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Explain like I'm 5 in English: {req.topic}"""},
                {"role": "user", "content": notes}
            ],
            timeout=30, max_tokens=2000
        )
        return {"eli5": response.choices[0].message.content}
    except Exception as e:
        return {"eli5": f"Error: {str(e)}"}

@app.post("/compare")
async def compare_docs(req: CompareRequest, current_user = Depends(get_current_user)):
    notes1 = stored_text.get(req.session_id_1, "")
    notes2 = stored_text.get(req.session_id_2, "")
    if not notes1 or not notes2:
        return {"compare": "Both documents required."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Compare two documents in English."""},
                {"role": "user", "content": f"DOC1:\n{notes1[:8000]}\n\nDOC2:\n{notes2[:8000]}"}
            ],
            timeout=45, max_tokens=3000
        )
        return {"compare": response.choices[0].message.content}
    except Exception as e:
        return {"compare": f"Error: {str(e)}"}

@app.post("/essay_grade")
async def essay_grade(req: EssayRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"essay_grade": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Grade this essay in English with scores and feedback."""},
                {"role": "user", "content": f"NOTES:\n{notes[:5000]}\n\nESSAY:\n{req.essay_text}"}
            ],
            timeout=45, max_tokens=3000
        )
        return {"essay_grade": response.choices[0].message.content}
    except Exception as e:
        return {"essay_grade": f"Error: {str(e)}"}

@app.post("/homework_help")
async def homework_help(req: HomeworkRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"homework_help": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Help with homework in English. Subject: {req.subject}"""},
                {"role": "user", "content": f"NOTES:\n{notes[:5000]}\n\nQUESTION:\n{req.question}"}
            ],
            timeout=45, max_tokens=3000
        )
        return {"homework_help": response.choices[0].message.content}
    except Exception as e:
        return {"homework_help": f"Error: {str(e)}"}

@app.post("/formula_sheet")
async def formula_sheet(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"formula_sheet": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create a formula sheet in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"formula_sheet": response.choices[0].message.content}
    except Exception as e:
        return {"formula_sheet": f"Error: {str(e)}"}

@app.post("/chapter_summary")
async def chapter_summary(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"chapter_summary": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create {req.count} chapter summaries in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"chapter_summary": response.choices[0].message.content}
    except Exception as e:
        return {"chapter_summary": f"Error: {str(e)}"}

@app.post("/simplify_words")
async def simplify_words(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"simplify_words": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Simplify {req.count} difficult words in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"simplify_words": response.choices[0].message.content}
    except Exception as e:
        return {"simplify_words": f"Error: {str(e)}"}

@app.post("/fill_blanks")
async def fill_blanks(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"fill_blanks": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create {req.count} fill-in-the-blank questions in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"fill_blanks": response.choices[0].message.content}
    except Exception as e:
        return {"fill_blanks": f"Error: {str(e)}"}

@app.post("/true_false")
async def true_false(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"true_false": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create {req.count} True/False questions in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"true_false": response.choices[0].message.content}
    except Exception as e:
        return {"true_false": f"Error: {str(e)}"}

@app.post("/short_answer")
async def short_answer(req: ActionRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"short_answer": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create {req.count} short answer questions in English."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"short_answer": response.choices[0].message.content}
    except Exception as e:
        return {"short_answer": f"Error: {str(e)}"}

@app.post("/debate")
async def debate(req: DebateRequest, current_user = Depends(get_current_user)):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"debate": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Debate both sides in English: {req.topic}"""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"debate": response.choices[0].message.content}
    except Exception as e:
        return {"debate": f"Error: {str(e)}"}