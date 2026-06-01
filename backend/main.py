from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os, tempfile, logging, time

from pdf_extractor import extract_text_from_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
MAX_NOTES_LENGTH = 45000

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
- IMPORTANT: If the user does not specify a language, DEFAULT to English
- If notes are in English and user asks in English, respond in English
"""

class ChatRequest(BaseModel):
    session_id: str
    question: str

class ActionRequest(BaseModel):
    session_id: str
    count: int = 5
    language: str = "auto"

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

# ========== HEALTH & ROOT ==========

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time(), "service": "AI Student Assistant"}

@app.get("/")
def root():
    return {
        "message": "AI Student Assistant API",
        "version": "2.0",
        "features": [
            "upload", "chat", "summarize", "quiz", "flashcards",
            "exam_predictor", "study_plan", "key_terms", "mind_map",
            "eli5", "compare", "essay_grade", "homework_help",
            "formula_sheet", "chapter_summary", "simplify_words",
            "fill_blanks", "true_false", "short_answer", "debate"
        ],
        "health": "/health"
    }

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

# ========== CORE FEATURES ==========

@app.post("/chat")
async def chat(req: ChatRequest):
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

Important: Detect the language of the user's question and respond in that exact same language. Default to English if unclear."""},
                {"role": "user", "content": req.question}
            ],
            timeout=30, max_tokens=2000
        )
        return {"answer": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"answer": f"Error: {str(e)}. Please try again."}

@app.post("/summarize")
async def summarize(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"summary": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
You are a study assistant. Summarize the following notes clearly with key points and main ideas.

Important: Detect the language of the notes and summarize in that same language. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=30, max_tokens=2000
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"Summarize error: {e}")
        return {"summary": f"Error: {str(e)}. Please try again."}

@app.post("/quiz")
async def generate_quiz(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"quiz": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
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

Important: Generate the quiz in the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"quiz": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"Quiz error: {e}")
        return {"quiz": f"Error: {str(e)}. Please try again."}

@app.post("/flashcards")
async def generate_flashcards(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"flashcards": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create exactly {req.count} flashcards from these notes.
Format each as:
Front: question
Back: answer
---

Important: Create flashcards in the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"flashcards": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"Flashcards error: {e}")
        return {"flashcards": f"Error: {str(e)}. Please try again."}

# ========== NEW AI FEATURES ==========

@app.post("/exam_predictor")
async def exam_predictor(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"exam_predictor": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
You are an expert exam predictor. Based on these notes, predict {req.count} questions that are MOST LIKELY to appear on an exam.
For each question, explain WHY it's likely to appear (pattern analysis, frequency, importance).
Format:
Q: [predicted question]
Likelihood: High/Medium/Low
Reason: [why this will likely be on the exam]
Answer: [model answer]

Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"exam_predictor": response.choices[0].message.content}
    except Exception as e:
        return {"exam_predictor": f"Error: {str(e)}"}

@app.post("/study_plan")
async def study_plan(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"study_plan": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create a 7-day study plan based on these notes. Each day should have:
- Day X: [Topic focus]
- Morning (2h): [specific activities]
- Afternoon (2h): [specific activities]
- Evening (1h): [review/flashcards]
- Goals: [what to master by end of day]

Make it realistic, actionable, and spaced for memory retention.
Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"study_plan": response.choices[0].message.content}
    except Exception as e:
        return {"study_plan": f"Error: {str(e)}"}

@app.post("/key_terms")
async def key_terms(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"key_terms": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Extract exactly {req.count} key terms and definitions from these notes.
Format each as:
Term: [term]
Definition: [clear definition]
Example: [usage example if applicable]
Importance: [why this matters]

Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"key_terms": response.choices[0].message.content}
    except Exception as e:
        return {"key_terms": f"Error: {str(e)}"}

@app.post("/mind_map")
async def mind_map(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"mind_map": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create a text-based mind map structure from these notes.
Format as a hierarchical tree using indentation and symbols:
📌 Central Topic: [main topic]
├─ 🌿 Branch 1: [subtopic]
│  ├─ 🍃 Leaf: [detail]
│  └─ 🍃 Leaf: [detail]
├─ 🌿 Branch 2: [subtopic]
│  ├─ 🍃 Leaf: [detail]
│  └─ 🍃 Leaf: [detail]

Make it comprehensive and well-organized. Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"mind_map": response.choices[0].message.content}
    except Exception as e:
        return {"mind_map": f"Error: {str(e)}"}

@app.post("/eli5")
async def eli5(req: ELI5Request):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"eli5": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Explain this topic like I'm 5 years old. Use:
- Simple words a child would understand
- Fun analogies (animals, toys, food, games)
- Short sentences
- A friendly, encouraging tone
- Maybe a little story to illustrate

Topic from notes: {req.topic}
Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=30, max_tokens=2000
        )
        return {"eli5": response.choices[0].message.content}
    except Exception as e:
        return {"eli5": f"Error: {str(e)}"}

@app.post("/compare")
async def compare_docs(req: CompareRequest):
    notes1 = stored_text.get(req.session_id_1, "")
    notes2 = stored_text.get(req.session_id_2, "")
    if not notes1 or not notes2:
        return {"compare": "Both documents required. Upload two files first."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Compare these two documents. Provide:
1. 📊 Similarities (what they agree on)
2. ⚡ Differences (where they disagree or differ)
3. 🎯 Unique to Doc 1 (only in first document)
4. 🎨 Unique to Doc 2 (only in second document)
5. 💡 Synthesis (combined insights)

Use the same language as the documents. Default to English if unclear."""},
                {"role": "user", "content": f"""DOCUMENT 1:
{notes1[:8000]}

DOCUMENT 2:
{notes2[:8000]}"""}
            ],
            timeout=45, max_tokens=3000
        )
        return {"compare": response.choices[0].message.content}
    except Exception as e:
        return {"compare": f"Error: {str(e)}"}

@app.post("/essay_grade")
async def essay_grade(req: EssayRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"essay_grade": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
You are an expert essay grader. Grade this essay based on the notes/context provided.
Provide:
1. 📊 Overall Score: X/100
2. 📝 Structure Score: X/100 (organization, flow, paragraphs)
3. 🧠 Content Score: X/100 (accuracy, depth, relevance to notes)
4. ✍️ Writing Score: X/100 (grammar, vocabulary, clarity)
5. 💪 Strengths: [what was done well]
6. ⚠️ Weaknesses: [what needs improvement]
7. 🎯 Specific Feedback: [line-by-line suggestions]
8. 📈 Improvement Plan: [how to get a better score next time]

Use the same language as the essay/notes. Default to English if unclear."""},
                {"role": "user", "content": f"""NOTES/CONTEXT:
{notes[:5000]}

STUDENT ESSAY:
{req.essay_text}"""}
            ],
            timeout=45, max_tokens=3000
        )
        return {"essay_grade": response.choices[0].message.content}
    except Exception as e:
        return {"essay_grade": f"Error: {str(e)}"}

@app.post("/homework_help")
async def homework_help(req: HomeworkRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"homework_help": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
You are a patient homework tutor. Help solve this homework problem step-by-step.
DO NOT just give the answer. Instead:
1. 🔍 Understand the problem (restate it)
2. 🧠 Recall relevant concepts from notes
3. 📝 Step-by-step solution with explanations
4. ✅ Final answer clearly marked
5. 💡 Similar practice problem for student to try

Subject: {req.subject}
Use the same language as the notes/question. Default to English if unclear."""},
                {"role": "user", "content": f"""NOTES:
{notes[:5000]}

HOMEWORK QUESTION:
{req.question}"""}
            ],
            timeout=45, max_tokens=3000
        )
        return {"homework_help": response.choices[0].message.content}
    except Exception as e:
        return {"homework_help": f"Error: {str(e)}"}

@app.post("/formula_sheet")
async def formula_sheet(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"formula_sheet": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Extract all formulas, equations, and mathematical/scientific relationships from these notes.
Format each as:
📐 Formula: [name/description]
🔢 Expression: [LaTeX or plain text formula]
📖 Variables: [what each symbol means]
🎯 When to use: [application context]
💡 Example: [worked example]

Create a clean, organized formula sheet. Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"formula_sheet": response.choices[0].message.content}
    except Exception as e:
        return {"formula_sheet": f"Error: {str(e)}"}

@app.post("/chapter_summary")
async def chapter_summary(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"chapter_summary": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Divide these notes into logical chapters/sections and summarize each one.
Format:
📖 Chapter X: [Title]
├─ 🎯 Key Points: [bullet points]
├─ 🔑 Important Concepts: [concepts]
├─ 📌 Must Remember: [critical info]
└─ ❓ Likely Exam Questions: [predicted questions]

Make {req.count} chapters. Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"chapter_summary": response.choices[0].message.content}
    except Exception as e:
        return {"chapter_summary": f"Error: {str(e)}"}

@app.post("/simplify_words")
async def simplify_words(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"simplify_words": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Find difficult or technical words in these notes and simplify them.
Format each as:
🔤 Word: [difficult word]
📚 Simple Definition: [easy explanation]
🔄 In Simple Words: [everyday language version]
🎯 Why it matters: [context]

Find exactly {req.count} words. Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"simplify_words": response.choices[0].message.content}
    except Exception as e:
        return {"simplify_words": f"Error: {str(e)}"}

@app.post("/fill_blanks")
async def fill_blanks(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"fill_blanks": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create exactly {req.count} fill-in-the-blank questions from these notes.
Format each as:
Sentence: [sentence with _____ for blank]
Answer: [correct word/phrase]
Hint: [subtle clue]

Make blanks test important concepts, not trivial words. Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"fill_blanks": response.choices[0].message.content}
    except Exception as e:
        return {"fill_blanks": f"Error: {str(e)}"}

@app.post("/true_false")
async def true_false(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"true_false": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create exactly {req.count} True/False questions from these notes.
Format each as:
Statement: [statement]
Answer: True/False
Explanation: [why it's true or false, with reference to notes]

Mix true and false statements evenly. Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"true_false": response.choices[0].message.content}
    except Exception as e:
        return {"true_false": f"Error: {str(e)}"}

@app.post("/short_answer")
async def short_answer(req: ActionRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"short_answer": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Create exactly {req.count} short answer questions from these notes.
Format each as:
Q: [question]
Expected Answer: [model answer in 2-4 sentences]
Key Points to Include: [bullet points]
Grading Rubric: [what makes a good answer]

Questions should require understanding, not just memorization. Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"short_answer": response.choices[0].message.content}
    except Exception as e:
        return {"short_answer": f"Error: {str(e)}"}

@app.post("/debate")
async def debate(req: DebateRequest):
    notes = stored_text.get(req.session_id, "")
    if not notes:
        return {"debate": "No notes found."}
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": f"""{LANGUAGE_INSTRUCTION}
Debate both sides of this topic based on the notes. Provide:
🏛️ TOPIC: {req.topic}

📗 SIDE A (Pro/For):
├─ Main Argument: [core position]
├─ Evidence from notes: [supporting points]
├─ Strengths: [why this side is compelling]
└─ Weaknesses: [potential flaws]

📕 SIDE B (Con/Against):
├─ Main Argument: [core position]
├─ Evidence from notes: [supporting points]
├─ Strengths: [why this side is compelling]
└─ Weaknesses: [potential flaws]

⚖️ BALANCED VIEW:
├─ Common Ground: [what both sides agree on]
├─ Critical Analysis: [nuanced perspective]
└─ Your Take: [reasoned conclusion]

Use the same language as the notes. Default to English if unclear."""},
                {"role": "user", "content": notes}
            ],
            timeout=45, max_tokens=3000
        )
        return {"debate": response.choices[0].message.content}
    except Exception as e:
        return {"debate": f"Error: {str(e)}"}