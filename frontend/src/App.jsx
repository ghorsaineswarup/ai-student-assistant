import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "https://ai-student-assistant-g0wl.onrender.com"
const COLORS = {
  purple: "#8b5cf6", pink: "#ec4899", green: "#10b981", amber: "#f59e0b",
  blue: "#3b82f6", red: "#ef4444", cyan: "#06b6d4", orange: "#f97316",
  teal: "#14b8a6", indigo: "#6366f1", rose: "#f43f5e", lime: "#84cc16"
}

const api = axios.create({
  baseURL: API,
  timeout: 90000,
})

async function wakeUpServer() {
  try {
    await api.get("/health")
    return true
  } catch {
    return false
  }
}

// ==================== VIEW COMPONENTS ====================

function FlashcardView({ raw }) {
  const cards = raw.split("---").map(c => c.trim()).filter(Boolean).map(card => {
    const f = card.match(/Front:\s*(.+)/i)
    const b = card.match(/Back:\s*([\s\S]+)/i)
    return { front: f?.[1] || card, back: b?.[1]?.trim() || "" }
  })
  const [cur, setCur] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const cols = [COLORS.purple, COLORS.pink, COLORS.green, COLORS.amber, COLORS.blue]
  const col = cols[cur % cols.length]

  if (!cards.length) return <p style={{ color: "#444", textAlign: "center", padding: 40 }}>No flashcards found.</p>

  return (
    <div>
      <div onClick={() => setFlipped(f => !f)}
        style={{
          cursor: "pointer", minHeight: 220, marginBottom: 24,
          background: flipped ? `${col}12` : "#111118",
          border: `2px solid ${flipped ? col : "#1e1e2e"}`,
          borderRadius: 24, padding: "40px 32px",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          textAlign: "center", transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: flipped ? `0 0 80px ${col}20` : "0 4px 24px rgba(0,0,0,0.3)",
          transform: flipped ? "scale(1.02)" : "scale(1)"
        }}>
        <p style={{ fontSize: 12, color: flipped ? col : "#555", marginBottom: 16, textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>
          {flipped ? "✨ answer" : "❓ question"} · {cur + 1}/{cards.length}
        </p>
        <p style={{ fontSize: 20, color: "#f0f0f5", lineHeight: 1.8, fontWeight: 500, maxWidth: "90%" }}>
          {flipped ? cards[cur].back : cards[cur].front}
        </p>
        <p style={{ fontSize: 12, color: "#333", marginTop: 20, fontWeight: 500 }}>tap to {flipped ? "flip back" : "reveal"}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button onClick={() => { setCur(Math.max(0, cur - 1)); setFlipped(false) }} disabled={cur === 0}
          style={{ padding: "10px 24px", borderRadius: 12, border: "1.5px solid #1e1e2e", background: "transparent", color: cur === 0 ? "#222" : "#aaa", cursor: cur === 0 ? "default" : "pointer", fontWeight: 600 }}>
          ← prev
        </button>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 400 }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => { setCur(i); setFlipped(false) }}
              style={{ width: i === cur ? 28 : 10, height: 10, borderRadius: 5, background: i === cur ? col : "#1e1e2e", cursor: "pointer", transition: "all 0.3s" }} />
          ))}
        </div>
        <button onClick={() => { setCur(Math.min(cards.length - 1, cur + 1)); setFlipped(false) }} disabled={cur === cards.length - 1}
          style={{ padding: "10px 24px", borderRadius: 12, border: "1.5px solid #1e1e2e", background: "transparent", color: cur === cards.length - 1 ? "#222" : "#aaa", cursor: cur === cards.length - 1 ? "default" : "pointer", fontWeight: 600 }}>
          next →
        </button>
      </div>
      <p style={{ textAlign: "center", color: "#333", fontSize: 13, marginTop: 16, fontWeight: 500 }}>{cur + 1} of {cards.length} cards</p>
    </div>
  )
}

function QuizView({ raw }) {
  const blocks = raw.split(/\n(?=Q\d*[:.])/i).map(b => b.trim()).filter(Boolean)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const score = Object.keys(revealed).filter(i => {
    const correct = blocks[i].split("\n").find(l => /^Answer:/i.test(l))?.replace(/Answer:/i, "").trim()
    return answers[i] === correct
  }).length

  return (
    <div>
      {Object.keys(revealed).length === blocks.length && blocks.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #0a1f0a, #0f2f0f)", border: "2px solid #10b981", borderRadius: 20, padding: 28, marginBottom: 24, textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>{score === blocks.length ? "🏆" : score >= blocks.length * 0.7 ? "🎉" : "📚"}</p>
          <p style={{ color: "#10b981", fontSize: 24, fontWeight: 800 }}>{score} / {blocks.length} correct</p>
          <p style={{ color: "#6ee7b7", fontSize: 14, marginTop: 8 }}>{score === blocks.length ? "Perfect score!" : score >= blocks.length * 0.7 ? "Great job!" : "Keep studying!"}</p>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {blocks.map((block, i) => {
          const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
          const question = lines[0].replace(/^Q\d*[:.]\s*/i, "")
          const options = lines.filter(l => /^[A-D]\)/i.test(l))
          const correct = lines.find(l => /^Answer:/i.test(l))?.replace(/Answer:/i, "").trim()
          return (
            <div key={i} style={{ background: "#0d0d1a", border: "1.5px solid #1e1e2e", borderRadius: 20, padding: 24 }}>
              <p style={{ fontWeight: 700, marginBottom: 16, color: "#e0e0f0", fontSize: 15 }}>Q{i + 1}. {question}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {options.map((opt, j) => {
                  const letter = opt[0], sel = answers[i] === letter
                  const good = revealed[i] && letter === correct
                  const bad = revealed[i] && sel && letter !== correct
                  return (
                    <div key={j} onClick={() => !revealed[i] && setAnswers(p => ({ ...p, [i]: letter }))}
                      style={{
                        padding: "14px 18px", borderRadius: 12, cursor: revealed[i] ? "default" : "pointer", fontSize: 14, transition: "all 0.2s", fontWeight: 500,
                        background: good ? "#0a1f0a" : bad ? "#1f0a0a" : sel ? "#150d28" : "#0a0a12",
                        border: `2px solid ${good ? "#10b981" : bad ? "#ef4444" : sel ? "#8b5cf6" : "#1e1e2e"}`,
                        color: good ? "#6ee7b7" : bad ? "#fca5a5" : sel ? "#c4b5fd" : "#777"
                      }}>
                      {opt}
                    </div>
                  )
                })}
              </div>
              {answers[i] && !revealed[i] && (
                <button onClick={() => setRevealed(p => ({ ...p, [i]: true }))}
                  style={{ marginTop: 16, padding: "10px 22px", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                  check answer
                </button>
              )}
              {revealed[i] && (
                <p style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: answers[i] === correct ? "#10b981" : "#ef4444" }}>
                  {answers[i] === correct ? "✓ correct!" : `✗ correct answer is ${correct}`}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryView({ text, onDownload }) {
  const lines = text.split("\n").filter(Boolean)
  const accents = [COLORS.purple, COLORS.pink, COLORS.green, COLORS.amber, COLORS.blue]
  return (
    <div>
      <button onClick={onDownload}
        style={{ marginBottom: 20, padding: "10px 22px", background: "linear-gradient(135deg, #111118, #1a1a2e)", border: "2px solid #8b5cf6", borderRadius: 12, color: "#8b5cf6", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
        ⬇ download summary
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ background: "#0d0d1a", borderLeft: `4px solid ${accents[i % accents.length]}`, borderRadius: "0 14px 14px 0", padding: "14px 20px", fontSize: 15, color: "#d0d0e8", lineHeight: 1.8 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

function TextView({ text, title, icon }) {
  const lines = text.split("\n").filter(Boolean)
  return (
    <div>
      <div style={{ marginBottom: 20, padding: "16px 20px", background: "linear-gradient(135deg, #111118, #1a1a2e)", borderRadius: 16, border: "1.5px solid #1e1e2e" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#f0f0f5" }}>{icon} {title}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            background: line.startsWith("📌") || line.startsWith("🏛️") || line.startsWith("📗") || line.startsWith("📕") ? "#0f0f1a" : "#0d0d1a",
            borderLeft: line.startsWith("├─") || line.startsWith("│") ? `2px solid ${COLORS.purple}40` : line.startsWith("📗") ? `3px solid ${COLORS.green}` : line.startsWith("📕") ? `3px solid ${COLORS.red}` : "none",
            borderRadius: 12, padding: "12px 18px", fontSize: 14, color: "#d0d0e8", lineHeight: 1.8,
            fontWeight: line.startsWith("📌") || line.startsWith("🏛️") ? 700 : 400,
            color: line.startsWith("📗") ? COLORS.green : line.startsWith("📕") ? COLORS.red : line.startsWith("⚖️") ? COLORS.amber : "#d0d0e8"
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

function EssayGradeView({ raw }) {
  const sections = raw.split(/\n(?=📊|📝|🧠|✍️|💪|⚠️|🎯|📈)/).map(s => s.trim()).filter(Boolean)
  return (
    <div>
      {sections.map((section, i) => (
        <div key={i} style={{ marginBottom: 16, background: "#0d0d1a", borderRadius: 16, padding: 20, border: "1.5px solid #1e1e2e" }}>
          <div style={{ fontSize: 14, color: "#d0d0e8", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{section}</div>
        </div>
      ))}
    </div>
  )
}

function Timer() {
  const [minutes, setMinutes] = useState(25)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState("work")
  const ref = useRef(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSeconds(s => {
          if (s === 0) {
            setMinutes(m => {
              if (m === 0) { setRunning(false); return mode === "work" ? 5 : 25 }
              return m - 1
            })
            return 59
          }
          return s - 1
        })
      }, 1000)
    } else clearInterval(ref.current)
    return () => clearInterval(ref.current)
  }, [running, mode])

  const reset = () => { setRunning(false); setMinutes(mode === "work" ? 25 : 5); setSeconds(0) }
  const switchMode = m => { setMode(m); setRunning(false); setMinutes(m === "work" ? 25 : 5); setSeconds(0) }
  const total = (mode === "work" ? 25 : 5) * 60
  const pct = (total - (minutes * 60 + seconds)) / total
  const r = 56, circ = 2 * Math.PI * r
  const col = mode === "work" ? COLORS.purple : COLORS.green

  return (
    <div style={{ background: "linear-gradient(135deg, #111118, #0d0d1a)", border: "1.5px solid #1e1e2e", borderRadius: 24, padding: 28, marginBottom: 24, textAlign: "center" }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
        {[["work", "⚡ focus"], ["break", "☕ break"]].map(([m, label]) => (
          <button key={m} onClick={() => switchMode(m)}
            style={{ padding: "8px 22px", borderRadius: 12, border: `2px solid ${mode === m ? col : "#1e1e2e"}`, background: mode === m ? col + "18" : "transparent", color: mode === m ? col : "#444", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 24px" }}>
        <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="#1e1e2e" strokeWidth="10" />
          <circle cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset 1s linear", strokeLinecap: "round" }} />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 28, fontWeight: 800, color: "#f0f0f5" }}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => setRunning(r => !r)}
          style={{ padding: "12px 32px", background: running ? "#1f0a0a" : `linear-gradient(135deg, ${col}, ${mode === "work" ? COLORS.pink : COLORS.teal})`, border: running ? "2px solid #ef4444" : "none", borderRadius: 14, color: running ? "#ef4444" : "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
          {running ? "⏸ pause" : "▶ start"}
        </button>
        <button onClick={reset}
          style={{ padding: "12px 22px", background: "transparent", border: "2px solid #1e1e2e", borderRadius: 14, color: "#444", cursor: "pointer", fontSize: 15 }}>
          ↺
        </button>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================

const accept = ".pdf,.txt,.docx,.pptx,.png,.jpg,.jpeg,.csv"

const ALL_FEATURES = [
  { id: "chat", label: "💬 Chat", col: COLORS.purple, icon: "💬", desc: "Ask anything", category: "core" },
  { id: "summarize", label: "📝 Summary", col: COLORS.amber, icon: "📝", desc: "Key points", category: "core" },
  { id: "quiz", label: "🧠 Quiz", col: COLORS.pink, icon: "🧠", desc: "MCQ test", category: "core" },
  { id: "flashcards", label: "🗂 Flashcards", col: COLORS.green, icon: "🗂", desc: "Study cards", category: "core" },
  { id: "exam_predictor", label: "🔮 Exam Predictor", col: COLORS.indigo, icon: "🔮", desc: "Predict questions", category: "ai" },
  { id: "study_plan", label: "📅 Study Plan", col: COLORS.blue, icon: "📅", desc: "7-day schedule", category: "ai" },
  { id: "key_terms", label: "🔑 Key Terms", col: COLORS.cyan, icon: "🔑", desc: "Definitions", category: "ai" },
  { id: "mind_map", label: "🌳 Mind Map", col: COLORS.teal, icon: "🌳", desc: "Visual structure", category: "ai" },
  { id: "eli5", label: "👶 ELI5", col: COLORS.orange, icon: "👶", desc: "Simple explain", category: "ai" },
  { id: "compare", label: "⚖️ Compare", col: COLORS.rose, icon: "⚖️", desc: "Two docs", category: "ai" },
  { id: "essay_grade", label: "✍️ Essay Grade", col: COLORS.purple, icon: "✍️", desc: "Grade & feedback", category: "ai" },
  { id: "homework_help", label: "📝 Homework", col: COLORS.pink, icon: "📝", desc: "Step-by-step", category: "ai" },
  { id: "formula_sheet", label: "📐 Formulas", col: COLORS.green, icon: "📐", desc: "Math/science", category: "ai" },
  { id: "chapter_summary", label: "📖 Chapters", col: COLORS.amber, icon: "📖", desc: "By section", category: "ai" },
  { id: "simplify_words", label: "🎯 Simplify", col: COLORS.blue, icon: "🎯", desc: "Easy words", category: "ai" },
  { id: "fill_blanks", label: "🕳️ Fill Blanks", col: COLORS.indigo, icon: "🕳️", desc: "Complete sentences", category: "ai" },
  { id: "true_false", label: "✅ True/False", col: COLORS.cyan, icon: "✅", desc: "Fact check", category: "ai" },
  { id: "short_answer", label: "✏️ Short Answer", col: COLORS.teal, icon: "✏️", desc: "Brief responses", category: "ai" },
  { id: "debate", label: "🎭 Debate", col: COLORS.orange, icon: "🎭", desc: "Both sides", category: "ai" },
]

export default function App() {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState("")
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState("")
  const [output, setOutput] = useState("")
  const [outputType, setOutputType] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [showTimer, setShowTimer] = useState(false)
  const [count, setCount] = useState(5)
  const [serverReady, setServerReady] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [essayText, setEssayText] = useState("")
  const [homeworkQ, setHomeworkQ] = useState("")
  const [homeworkSubject, setHomeworkSubject] = useState("general")
  const [eli5Topic, setEli5Topic] = useState("")
  const [debateTopic, setDebateTopic] = useState("")
  const [compareId, setCompareId] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const chatEndRef = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  useEffect(() => {
    wakeUpServer().then(ok => setServerReady(ok))
    const interval = setInterval(() => wakeUpServer().then(ok => setServerReady(ok)), 30000)
    return () => clearInterval(interval)
  }, [])

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!serverReady) {
      setMessages([{ role: "assistant", text: "⏳ Waking up server... please wait 15-30 seconds." }])
      const ok = await wakeUpServer()
      setServerReady(ok)
      if (!ok) {
        setMessages([{ role: "assistant", text: "❌ Server is unavailable. Please try again in 30 seconds." }])
        return
      }
    }
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await api.post("/upload", form)
      const sid = res.data.session_id
      setSessionId(sid)
      setSessions(prev => prev.find(s => s.id === sid) ? prev : [...prev, { id: sid, name: file.name }])
      setMessages([{ role: "assistant", text: `✅ "${file.name}" uploaded! Ask me anything about it.` }])
      setActiveTab("chat"); setOutput("")
    } catch (err) {
      setMessages([{ role: "assistant", text: "❌ Upload failed. " + (err.response?.data?.error || "Server may be waking up. Wait 30 seconds and try again.") }])
    }
    setUploading(false)
    e.target.value = ""
  }

  const sendMessage = async () => {
    if (!question.trim() || !sessionId) return
    const q = question
    setMessages(prev => [...prev, { role: "user", text: q }])
    setQuestion("")
    setLoading(true)
    try {
      const res = await api.post("/chat", { session_id: sessionId, question: q })
      setMessages(prev => [...prev, { role: "assistant", text: res.data.answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "❌ " + (err.response?.data?.detail || "Server error. Please try again.") }])
    }
    setLoading(false)
  }

  const doAction = async (action, extraData = {}) => {
    if (!sessionId && action !== "compare") return
    setLoading(true); setOutput(""); setOutputType(action); setActiveTab(action)
    try {
      let res
      if (action === "compare") {
        if (!compareId) { setOutput("❌ Select a second document to compare"); setLoading(false); return }
        res = await api.post("/compare", { session_id_1: sessionId, session_id_2: compareId })
      } else if (action === "essay_grade") {
        if (!essayText.trim()) { setOutput("❌ Paste your essay first"); setLoading(false); return }
        res = await api.post("/essay_grade", { session_id: sessionId, essay_text: essayText })
      } else if (action === "homework_help") {
        if (!homeworkQ.trim()) { setOutput("❌ Enter your homework question"); setLoading(false); return }
        res = await api.post("/homework_help", { session_id: sessionId, question: homeworkQ, subject: homeworkSubject })
      } else if (action === "eli5") {
        if (!eli5Topic.trim()) { setOutput("❌ Enter a topic to explain"); setLoading(false); return }
        res = await api.post("/eli5", { session_id: sessionId, topic: eli5Topic })
      } else if (action === "debate") {
        if (!debateTopic.trim()) { setOutput("❌ Enter a debate topic"); setLoading(false); return }
        res = await api.post("/debate", { session_id: sessionId, topic: debateTopic })
      } else {
        res = await api.post(`/${action}`, { session_id: sessionId, count })
      }
      const keyMap = {
        summarize: "summary", quiz: "quiz", flashcards: "flashcards",
        exam_predictor: "exam_predictor", study_plan: "study_plan",
        key_terms: "key_terms", mind_map: "mind_map", eli5: "eli5",
        compare: "compare", essay_grade: "essay_grade", homework_help: "homework_help",
        formula_sheet: "formula_sheet", chapter_summary: "chapter_summary",
        simplify_words: "simplify_words", fill_blanks: "fill_blanks",
        true_false: "true_false", short_answer: "short_answer", debate: "debate"
      }
      const result = res.data[keyMap[action]]
      if (!result) throw new Error("Empty response")
      setOutput(result)
    } catch (err) {
      const msg = err.code === "ECONNABORTED" || err.code === "ERR_NETWORK"
        ? "⏱ Server is waking up or busy. Wait 30 seconds and click retry."
        : "❌ Error: " + (err.response?.data?.detail || err.message || "Unknown error")
      setOutput(msg)
    }
    setLoading(false)
  }

  const downloadOutput = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([output], { type: "text/plain" }))
    a.download = `${outputType}.txt`; a.click()
  }

  const filteredFeatures = activeCategory === "all" ? ALL_FEATURES : ALL_FEATURES.filter(f => f.category === activeCategory)

  const renderInputSection = () => {
    if (outputType === "essay_grade") {
      return (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>Paste your essay below:</p>
          <textarea
            value={essayText} onChange={e => setEssayText(e.target.value)}
            placeholder="Paste your essay here..."
            style={{ width: "100%", minHeight: 200, padding: 16, background: "#0d0d1a", border: "1.5px solid #1e1e2e", borderRadius: 14, color: "#f0f0f5", fontSize: 14, lineHeight: 1.7, resize: "vertical", outline: "none" }}
          />
          <button onClick={() => doAction("essay_grade")}
            style={{ marginTop: 12, padding: "12px 28px", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            ✍️ Grade My Essay
          </button>
        </div>
      )
    }
    if (outputType === "homework_help") {
      return (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input value={homeworkSubject} onChange={e => setHomeworkSubject(e.target.value)}
              placeholder="Subject (e.g. Math, Physics)..."
              style={{ flex: 1, padding: "12px 16px", background: "#0d0d1a", border: "1.5px solid #1e1e2e", borderRadius: 12, color: "#f0f0f5", fontSize: 14, outline: "none" }} />
          </div>
          <textarea
            value={homeworkQ} onChange={e => setHomeworkQ(e.target.value)}
            placeholder="Paste your homework question here..."
            style={{ width: "100%", minHeight: 120, padding: 16, background: "#0d0d1a", border: "1.5px solid #1e1e2e", borderRadius: 14, color: "#f0f0f5", fontSize: 14, lineHeight: 1.7, resize: "vertical", outline: "none" }}
          />
          <button onClick={() => doAction("homework_help")}
            style={{ marginTop: 12, padding: "12px 28px", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            📝 Help Me Solve
          </button>
        </div>
      )
    }
    if (outputType === "eli5") {
      return (
        <div style={{ marginBottom: 20 }}>
          <input value={eli5Topic} onChange={e => setEli5Topic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doAction("eli5")}
            placeholder="What topic should I explain like you're 5?..."
            style={{ width: "100%", padding: "14px 18px", background: "#0d0d1a", border: "1.5px solid #1e1e2e", borderRadius: 14, color: "#f0f0f5", fontSize: 14, outline: "none", marginBottom: 12 }} />
          <button onClick={() => doAction("eli5")}
            style={{ padding: "12px 28px", background: "linear-gradient(135deg, #f59e0b, #ec4899)", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            👶 Explain Like I'm 5
          </button>
        </div>
      )
    }
    if (outputType === "debate") {
      return (
        <div style={{ marginBottom: 20 }}>
          <input value={debateTopic} onChange={e => setDebateTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doAction("debate")}
            placeholder="Enter a topic to debate..."
            style={{ width: "100%", padding: "14px 18px", background: "#0d0d1a", border: "1.5px solid #1e1e2e", borderRadius: 14, color: "#f0f0f5", fontSize: 14, outline: "none", marginBottom: 12 }} />
          <button onClick={() => doAction("debate")}
            style={{ padding: "12px 28px", background: "linear-gradient(135deg, #f97316, #ef4444)", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            🎭 Debate Both Sides
          </button>
        </div>
      )
    }
    if (outputType === "compare") {
      return (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>Select second document to compare with current:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.filter(s => s.id !== sessionId).map(s => (
              <div key={s.id} onClick={() => setCompareId(s.id)}
                style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer", background: compareId === s.id ? "#150d28" : "#0d0d1a", border: `2px solid ${compareId === s.id ? "#ec4899" : "#1e1e2e"}`, color: compareId === s.id ? "#ec4899" : "#777" }}>
                📄 {s.name} {compareId === s.id && "✓"}
              </div>
            ))}
            {sessions.filter(s => s.id !== sessionId).length === 0 && (
              <p style={{ color: "#444", fontSize: 13 }}>Upload another document first to compare</p>
            )}
          </div>
          {compareId && (
            <button onClick={() => doAction("compare")}
              style={{ marginTop: 12, padding: "12px 28px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              ⚖️ Compare Documents
            </button>
          )}
        </div>
      )
    }
    return null
  }

  const renderOutput = () => {
    if (!output) return <p style={{ color: "#222", textAlign: "center", padding: 60, fontSize: 14 }}>click a button to generate</p>
    if (output.startsWith("⏱") || output.startsWith("❌")) {
      return (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#ef4444", fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>{output}</p>
          <button onClick={() => doAction(outputType)}
            style={{ padding: "12px 28px", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🔄 retry
          </button>
        </div>
      )
    }

    const feature = ALL_FEATURES.find(f => f.id === outputType)
    const icon = feature?.icon || "📝"
    const title = feature?.label || outputType

    if (outputType === "flashcards") return <FlashcardView raw={output} />
    if (outputType === "quiz") return <QuizView raw={output} />
    if (outputType === "summarize") return <SummaryView text={output} onDownload={downloadOutput} />
    if (outputType === "essay_grade") return <EssayGradeView raw={output} />
    if (["chat", "exam_predictor", "study_plan", "key_terms", "mind_map", "eli5", "compare", "homework_help", "formula_sheet", "chapter_summary", "simplify_words", "fill_blanks", "true_false", "short_answer", "debate"].includes(outputType)) {
      return <TextView text={output} title={title} icon={icon} />
    }
    return <TextView text={output} title={title} icon={icon} />
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070f", color: "#eeeef5", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900, background: "linear-gradient(135deg, #8b5cf6, #ec4899, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6, letterSpacing: -1 }}>
              AI Student Assistant
            </h1>
            <p style={{ color: "#444", fontSize: 14, fontWeight: 500 }}>upload · chat · summarize · quiz · flashcards · 20+ AI tools</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ padding: "6px 14px", borderRadius: 20, background: serverReady ? "#0a1f0a" : "#1f0a0a", border: `1.5px solid ${serverReady ? "#10b981" : "#ef4444"}`, color: serverReady ? "#10b981" : "#ef4444", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: serverReady ? "#10b981" : "#ef4444", animation: serverReady ? "none" : "pulse 1.5s infinite" }} />
              {serverReady ? "online" : "waking up..."}
            </div>
            <button onClick={() => setShowTimer(t => !t)}
              style={{ padding: "10px 18px", background: showTimer ? "#8b5cf618" : "#111118", border: `2px solid ${showTimer ? "#8b5cf6" : "#1e1e2e"}`, borderRadius: 12, color: showTimer ? "#8b5cf6" : "#444", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              ⏱ timer
            </button>
          </div>
        </div>

        {showTimer && <Timer />}

        {/* UPLOAD */}
        <div style={{ background: "linear-gradient(135deg, #111118, #0d0d1a)", border: sessionId ? "2px solid #8b5cf630" : "2px dashed #1e1e2e", borderRadius: 24, padding: 32, marginBottom: 24, transition: "all 0.3s" }}>
          {!sessionId ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 20px #8b5cf640)" }}>📚</p>
              <p style={{ color: "#555", marginBottom: 8, fontSize: 16, fontWeight: 600 }}>Upload any study material</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                {["📄 PDF","📝 Text","📘 Word","📊 PowerPoint","🖼 Image","📋 CSV"].map(f => (
                  <span key={f} style={{ padding: "6px 14px", background: "#0a0a12", border: "1.5px solid #1e1e2e", borderRadius: 20, fontSize: 12, color: "#555", fontWeight: 500 }}>{f}</span>
                ))}
              </div>
              <label style={{
                cursor: serverReady ? "pointer" : "not-allowed",
                background: serverReady ? "linear-gradient(135deg, #8b5cf6, #ec4899)" : "#1e1e2e",
                padding: "14px 36px", borderRadius: 14, fontSize: 15, color: "#fff", fontWeight: 800,
                display: "inline-block", boxShadow: serverReady ? "0 8px 32px #8b5cf640" : "none", transition: "all 0.3s"
              }}>
                {uploading ? "⏳ uploading..." : serverReady ? "📁 choose file" : "⏳ waking up server..."}
                <input type="file" accept={accept} onChange={uploadFile} disabled={!serverReady} style={{ display: "none" }} />
              </label>
              {!serverReady && <p style={{ color: "#444", fontSize: 13, marginTop: 12 }}>Server is waking up, please wait 15-30 seconds...</p>}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ color: "#444", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>📂 loaded files</p>
                <span style={{ color: "#8b5cf6", fontSize: 12, fontWeight: 600 }}>{sessions.length} file{sessions.length > 1 ? "s" : ""}</span>
              </div>
              {sessions.map(s => (
                <div key={s.id} onClick={() => setSessionId(s.id)}
                  style={{ padding: "12px 18px", borderRadius: 14, marginBottom: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, background: sessionId === s.id ? "linear-gradient(135deg, #150d28, #1a0f3a)" : "#0a0a12", border: `2px solid ${sessionId === s.id ? "#8b5cf6" : "transparent"}`, color: sessionId === s.id ? "#c4b5fd" : "#555", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📄</span> {s.name}
                  {sessionId === s.id && <span style={{ marginLeft: "auto", color: "#8b5cf6", fontSize: 12 }}>active</span>}
                </div>
              ))}
              <label style={{ cursor: "pointer", color: "#8b5cf6", fontSize: 13, fontWeight: 600, textDecoration: "none", marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "#8b5cf610", border: "1.5px solid #8b5cf630" }}>
                <span>+</span> upload another
                <input type="file" accept={accept} onChange={uploadFile} style={{ display: "none" }} />
              </label>
            </div>
          )}
        </div>

        {/* FEATURE GRID */}
        {sessionId && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[{ id: "all", label: "✨ All" }, { id: "core", label: "🔥 Core" }, { id: "ai", label: "🧠 AI Tools" }].map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  style={{ padding: "8px 18px", borderRadius: 10, border: `2px solid ${activeCategory === cat.id ? "#8b5cf6" : "#1e1e2e"}`, background: activeCategory === cat.id ? "#8b5cf618" : "transparent", color: activeCategory === cat.id ? "#8b5cf6" : "#444", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  {cat.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ color: "#333", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                count: {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    style={{ padding: "5px 14px", borderRadius: 8, border: `2px solid ${count === n ? "#8b5cf6" : "#1e1e2e"}`, background: count === n ? "#8b5cf618" : "transparent", color: count === n ? "#8b5cf6" : "#333", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    {n}
                  </button>
                ))}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {filteredFeatures.map(btn => (
                <button key={btn.id} onClick={() => doAction(btn.id)}
                  style={{
                    padding: "16px 14px", borderRadius: 16, border: `2px solid ${activeTab === btn.id ? btn.col : "#1e1e2e"}`,
                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                    background: activeTab === btn.id ? `${btn.col}18` : "linear-gradient(135deg, #111118, #0d0d1a)",
                    color: activeTab === btn.id ? btn.col : "#666",
                    boxShadow: activeTab === btn.id ? `0 0 24px ${btn.col}25` : "none",
                    transition: "all 0.3s", display: "flex", flexDirection: "column", alignItems: "center", gap: 8
                  }}>
                  <span style={{ fontSize: 28 }}>{btn.icon}</span>
                  <span>{btn.label}</span>
                  <span style={{ fontSize: 11, color: "#333", fontWeight: 500 }}>{btn.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("chat")}
            style={{ padding: "10px 22px", borderRadius: 12, border: `2px solid ${activeTab === "chat" ? "#8b5cf6" : "#1e1e2e"}`, fontSize: 14, fontWeight: 700, cursor: "pointer", background: activeTab === "chat" ? "#8b5cf618" : "#111118", color: activeTab === "chat" ? "#8b5cf6" : "#444" }}>
            💬 chat
          </button>
          {output && (
            <button onClick={() => setActiveTab(outputType)}
              style={{ padding: "10px 22px", borderRadius: 12, border: `2px solid ${activeTab === outputType ? ALL_FEATURES.find(f => f.id === outputType)?.col || "#ec4899" : "#1e1e2e"}`, fontSize: 14, fontWeight: 700, cursor: "pointer", background: activeTab === outputType ? `${ALL_FEATURES.find(f => f.id === outputType)?.col || "#ec4899"}18` : "#111118", color: activeTab === outputType ? ALL_FEATURES.find(f => f.id === outputType)?.col || "#ec4899" : "#444" }}>
              {ALL_FEATURES.find(f => f.id === outputType)?.icon || "📝"} {outputType.replace(/_/g, " ")}
            </button>
          )}
        </div>

        {/* CONTENT AREA */}
        {activeTab === "chat" ? (
          <>
            <div style={{ background: "linear-gradient(135deg, #111118, #0d0d1a)", border: "2px solid #1e1e2e", borderRadius: 24, padding: 24, minHeight: 320, marginBottom: 16, overflowY: "auto", maxHeight: 480 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", marginTop: 100 }}>
                  <p style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 20px #8b5cf630)" }}>🎓</p>
                  <p style={{ color: "#222", fontSize: 15, fontWeight: 500 }}>upload a file to start chatting</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "14px 20px", borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                    fontSize: 15, lineHeight: 1.8, color: "#f0f0f5", whiteSpace: "pre-wrap",
                    background: m.role === "user" ? "linear-gradient(135deg, #8b5cf6, #7c3aed)" : "#1a1a28",
                    boxShadow: m.role === "user" ? "0 4px 20px #8b5cf630" : "none"
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 6, padding: 12, alignItems: "center" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6", animation: `bounce 1s ${i * 0.15}s infinite` }} />)}
                  <span style={{ color: "#444", fontSize: 13, marginLeft: 8 }}>thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <input value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={sessionId ? "ask anything about your notes..." : "upload a file first"}
                disabled={!sessionId}
                style={{ flex: 1, padding: "16px 22px", background: "#111118", border: "2px solid #1e1e2e", borderRadius: 16, color: "#f0f0f5", fontSize: 15, outline: "none", transition: "all 0.2s" }} />
              <button onClick={sendMessage} disabled={!sessionId || loading}
                style={{ padding: "16px 28px", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", border: "none", borderRadius: 16, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800, boxShadow: "0 4px 20px #8b5cf640" }}>
                send
              </button>
            </div>
          </>
        ) : (
          <div style={{ background: "linear-gradient(135deg, #111118, #0d0d1a)", border: "2px solid #1e1e2e", borderRadius: 24, padding: 28 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 80 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", animation: `bounce 1s ${i * 0.15}s infinite` }} />)}
                </div>
                <p style={{ color: "#333", fontSize: 15, fontWeight: 500 }}>generating {count} {outputType === "flashcards" ? "flashcards" : outputType === "quiz" ? "questions" : outputType.replace(/_/g, " ")}...</p>
                <p style={{ color: "#222", fontSize: 12, marginTop: 8 }}>this may take 10-30 seconds</p>
              </div>
            ) : (
              <>
                {renderInputSection()}
                {renderOutput()}
                {output && !output.startsWith("⏱") && !output.startsWith("❌") && outputType !== "chat" && (
                  <button onClick={downloadOutput}
                    style={{ marginTop: 24, padding: "10px 22px", background: "#0d0d1a", border: "2px solid #1e1e2e", borderRadius: 12, color: "#555", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    ⬇ download result
                  </button>
                )}
              </>
            )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input::placeholder { color: #333; }
        textarea::placeholder { color: #333; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a12; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 6px; }
        ::-webkit-scrollbar-thumb:hover { background: #2e2e3e; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover:not(:disabled) { transform: translateY(-1px); }
        button:active:not(:disabled) { transform: translateY(0); }
      `}</style>
    </div>
  )
}
