import { useState, useEffect, useRef } from "react"
import axios from "axios"
const API = import.meta.env.VITE_API_URL || "http://localhost:8000"
function FlashcardView({ raw }) {
  const cards = raw.split("---").map(c => c.trim()).filter(Boolean).map(card => {
    const frontMatch = card.match(/Front:\s*(.+)/i)
    const backMatch = card.match(/Back:\s*(.+)/i)
    return { front: frontMatch?.[1] || card, back: backMatch?.[1] || "" }
  })
  const [flipped, setFlipped] = useState({})
  const [current, setCurrent] = useState(0)
  return (
    <div>
      <div onClick={() => setFlipped(p => ({ ...p, [current]: !p[current] }))}
        style={{ cursor: "pointer", minHeight: 180, background: flipped[current] ? "#4f46e5" : "#1e1e2e", border: "1px solid #333", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", transition: "all 0.3s", marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: flipped[current] ? "#c7d2fe" : "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{flipped[current] ? "Answer" : "Question"} — Card {current + 1} of {cards.length}</p>
        <p style={{ fontSize: 18, color: "#f0f0f0", lineHeight: 1.6 }}>{flipped[current] ? cards[current].back : cards[current].front}</p>
        <p style={{ fontSize: 12, color: flipped[current] ? "#c7d2fe" : "#555", marginTop: 16 }}>tap to {flipped[current] ? "flip back" : "reveal answer"}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <button onClick={() => { setCurrent(p => Math.max(0, p - 1)); setFlipped({}) }}
          disabled={current === 0}
          style={{ padding: "8px 20px", background: "#1e1e2e", border: "1px solid #333", borderRadius: 8, color: current === 0 ? "#444" : "#f0f0f0", cursor: current === 0 ? "default" : "pointer" }}>← Prev</button>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => { setCurrent(i); setFlipped({}) }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: i === current ? "#4f46e5" : "#333", cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
        <button onClick={() => { setCurrent(p => Math.min(cards.length - 1, p + 1)); setFlipped({}) }}
          disabled={current === cards.length - 1}
          style={{ padding: "8px 20px", background: "#1e1e2e", border: "1px solid #333", borderRadius: 8, color: current === cards.length - 1 ? "#444" : "#f0f0f0", cursor: current === cards.length - 1 ? "default" : "pointer" }}>Next →</button>
      </div>
    </div>
  )
}

function QuizView({ raw }) {
  const blocks = raw.split(/\n(?=Q\d*[:.])/i).map(b => b.trim()).filter(Boolean)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const score = Object.keys(revealed).filter(i => {
    const lines = blocks[i].split("\n").map(l => l.trim()).filter(Boolean)
    const answerLine = lines.find(l => /^Answer:/i.test(l))
    const correct = answerLine?.replace(/Answer:/i, "").trim()
    return answers[i] === correct
  }).length
  return (
    <div>
      {Object.keys(revealed).length === blocks.length && blocks.length > 0 && (
        <div style={{ background: "#14532d", border: "1px solid #22c55e", borderRadius: 12, padding: 16, marginBottom: 20, textAlign: "center" }}>
          <p style={{ color: "#86efac", fontSize: 18, fontWeight: 600 }}>Score: {score} / {blocks.length}</p>
          <p style={{ color: "#86efac", fontSize: 13, marginTop: 4 }}>{score === blocks.length ? "Perfect!" : score >= blocks.length / 2 ? "Good job!" : "Keep studying!"}</p>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {blocks.map((block, i) => {
          const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
          const question = lines[0]
          const options = lines.filter(l => /^[A-D]\)/i.test(l))
          const answerLine = lines.find(l => /^Answer:/i.test(l))
          const correct = answerLine?.replace(/Answer:/i, "").trim()
          return (
            <div key={i} style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 14, padding: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 14, color: "#e0e0f0", fontSize: 15 }}>{question}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {options.map((opt, j) => {
                  const letter = opt[0]
                  const isSelected = answers[i] === letter
                  const isCorrect = revealed[i] && letter === correct
                  const isWrong = revealed[i] && isSelected && letter !== correct
                  return (
                    <div key={j} onClick={() => !revealed[i] && setAnswers(p => ({ ...p, [i]: letter }))}
                      style={{ padding: "10px 16px", borderRadius: 8, cursor: revealed[i] ? "default" : "pointer", fontSize: 14, border: "1px solid", transition: "all 0.2s",
                        background: isCorrect ? "#14532d" : isWrong ? "#450a0a" : isSelected ? "#1e1b4b" : "#12121f",
                        borderColor: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : isSelected ? "#6366f1" : "#2a2a3e",
                        color: isCorrect ? "#86efac" : isWrong ? "#fca5a5" : isSelected ? "#c7d2fe" : "#a0a0c0" }}>
                      {opt}
                    </div>
                  )
                })}
              </div>
              {answers[i] && !revealed[i] && (
                <button onClick={() => setRevealed(p => ({ ...p, [i]: true }))}
                  style={{ marginTop: 12, padding: "8px 18px", background: "#4f46e5", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>
                  Check Answer
                </button>
              )}
              {revealed[i] && (
                <p style={{ marginTop: 10, fontSize: 13, color: answers[i] === correct ? "#86efac" : "#fca5a5" }}>
                  {answers[i] === correct ? "✓ Correct!" : `✗ Correct answer is ${correct}`}
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
  return (
    <div>
      <button onClick={onDownload}
        style={{ marginBottom: 16, padding: "8px 18px", background: "#13131f", border: "1px solid #4f46e5", borderRadius: 8, color: "#818cf8", cursor: "pointer", fontSize: 13 }}>
        ⬇ Download Summary
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ background: "#1e1e2e", borderLeft: "3px solid #4f46e5", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#d0d0f0", lineHeight: 1.7 }}>
            {line}
          </div>
        ))}
      </div>
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
              if (m === 0) {
                setRunning(false)
                clearInterval(ref.current)
                return mode === "work" ? 5 : 25
              }
              return m - 1
            })
            return 59
          }
          return s - 1
        })
      }, 1000)
    } else clearInterval(ref.current)
    return () => clearInterval(ref.current)
  }, [running])
  const reset = () => { setRunning(false); setMinutes(mode === "work" ? 25 : 5); setSeconds(0) }
  const switchMode = (m) => { setMode(m); setRunning(false); setMinutes(m === "work" ? 25 : 5); setSeconds(0) }
  const pct = ((mode === "work" ? 25 : 5) * 60 - (minutes * 60 + seconds)) / ((mode === "work" ? 25 : 5) * 60) * 100
  return (
    <div style={{ background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 16, padding: 24, textAlign: "center" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
        {["work", "break"].map(m => (
          <button key={m} onClick={() => switchMode(m)}
            style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid", fontSize: 13, cursor: "pointer", background: mode === m ? "#4f46e5" : "transparent", borderColor: mode === m ? "#4f46e5" : "#333", color: mode === m ? "#fff" : "#888" }}>
            {m === "work" ? "Focus 25m" : "Break 5m"}
          </button>
        ))}
      </div>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 20px" }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="54" fill="none" stroke="#2a2a3e" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="#4f46e5" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 54}`} strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
            style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 22, fontWeight: 700, color: "#f0f0f0" }}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setRunning(r => !r)}
          style={{ padding: "8px 24px", background: "#4f46e5", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14 }}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={reset}
          style={{ padding: "8px 16px", background: "transparent", border: "1px solid #333", borderRadius: 8, color: "#888", cursor: "pointer", fontSize: 14 }}>
          Reset
        </button>
      </div>
    </div>
  )
}

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
  const chatEndRef = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    const res = await axios.post(`${API}/upload`, form)
    const sid = res.data.session_id
    setSessionId(sid)
    setSessions(prev => prev.find(s => s.id === sid) ? prev : [...prev, { id: sid, name: file.name }])
    setMessages([{ role: "assistant", text: `"${file.name}" uploaded! Ask me anything about it.` }])
    setActiveTab("chat")
    setOutput("")
    setUploading(false)
  }

  const sendMessage = async () => {
    if (!question.trim() || !sessionId) return
    const userMsg = { role: "user", text: question }
    setMessages(prev => [...prev, userMsg])
    setQuestion("")
    setLoading(true)
    const res = await axios.post(`${API}/chat`, { session_id: sessionId, question })
    setMessages(prev => [...prev, { role: "assistant", text: res.data.answer }])
    setLoading(false)
  }

  const doAction = async (action) => {
    if (!sessionId) return
    setLoading(true)
    setOutput("")
    setOutputType(action)
    setActiveTab(action)
    const res = await axios.post(`${API}/${action}`, { session_id: sessionId })
    setOutput(res.data[action === "summarize" ? "summary" : action === "quiz" ? "quiz" : "flashcards"])
    setLoading(false)
  }

  const downloadSummary = () => {
    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "summary.txt"
    a.click()
  }

  const tabs = [
    { id: "chat", label: "💬 Chat" },
    { id: "summarize", label: "📝 Summary" },
    { id: "quiz", label: "🧠 Quiz" },
    { id: "flashcards", label: "🗂 Flashcards" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
              AI Student Assistant
            </h1>
            <p style={{ color: "#555", fontSize: 13 }}>Upload notes · Chat · Summarize · Quiz · Flashcards</p>
          </div>
          <button onClick={() => setShowTimer(t => !t)}
            style={{ padding: "8px 16px", background: showTimer ? "#4f46e5" : "#13131f", border: "1px solid #2a2a3e", borderRadius: 10, color: showTimer ? "#fff" : "#888", cursor: "pointer", fontSize: 13 }}>
            ⏱ Timer
          </button>
        </div>

        {showTimer && <div style={{ marginBottom: 24 }}><Timer /></div>}

        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, background: "#13131f", border: sessionId ? "1px solid #4f46e5" : "1px dashed #2a2a3e", borderRadius: 14, padding: 20 }}>
            {!sessionId ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#888", marginBottom: 12, fontSize: 14 }}>Upload a PDF or .txt file</p>
                <label style={{ cursor: "pointer", background: "#4f46e5", padding: "9px 22px", borderRadius: 8, fontSize: 13, color: "#fff" }}>
                  {uploading ? "Uploading..." : "Choose File"}
                  <input type="file" accept=".pdf,.txt" onChange={uploadFile} style={{ display: "none" }} />
                </label>
              </div>
            ) : (
              <div>
                <p style={{ color: "#555", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Loaded files</p>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => setSessionId(s.id)}
                    style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", fontSize: 13, background: sessionId === s.id ? "#1e1b4b" : "transparent", border: "1px solid", borderColor: sessionId === s.id ? "#4f46e5" : "transparent", color: sessionId === s.id ? "#c7d2fe" : "#888" }}>
                    📄 {s.name}
                  </div>
                ))}
                <label style={{ cursor: "pointer", color: "#555", fontSize: 12, textDecoration: "underline", marginTop: 8, display: "block" }}>
                  + upload another
                  <input type="file" accept=".pdf,.txt" onChange={uploadFile} style={{ display: "none" }} />
                </label>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
            {tabs.slice(1).map(tab => (
              <button key={tab.id} onClick={() => doAction(tab.id)}
                disabled={!sessionId}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid", cursor: sessionId ? "pointer" : "default", fontSize: 13, transition: "all 0.2s", whiteSpace: "nowrap",
                  background: activeTab === tab.id ? "#4f46e5" : "#13131f",
                  borderColor: activeTab === tab.id ? "#4f46e5" : "#2a2a3e",
                  color: !sessionId ? "#333" : activeTab === tab.id ? "#fff" : "#888" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setActiveTab("chat")}
            style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, cursor: "pointer", background: activeTab === "chat" ? "#4f46e5" : "#13131f", borderColor: activeTab === "chat" ? "#4f46e5" : "#2a2a3e", color: activeTab === "chat" ? "#fff" : "#888" }}>
            💬 Chat
          </button>
          {output && (
            <button onClick={() => setActiveTab(outputType)}
              style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, cursor: "pointer", background: activeTab === outputType ? "#4f46e5" : "#13131f", borderColor: activeTab === outputType ? "#4f46e5" : "#2a2a3e", color: activeTab === outputType ? "#fff" : "#888", textTransform: "capitalize" }}>
              {outputType === "summarize" ? "📝" : outputType === "quiz" ? "🧠" : "🗂"} {outputType}
            </button>
          )}
        </div>

        {activeTab === "chat" && (
          <>
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: 20, minHeight: 300, marginBottom: 16, overflowY: "auto", maxHeight: 420 }}>
              {messages.length === 0 && (
                <p style={{ color: "#333", textAlign: "center", marginTop: 100, fontSize: 14 }}>Upload a file to start chatting</p>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", background: m.role === "user" ? "#4f46e5" : "#1e1e2e", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 14, lineHeight: 1.7, color: "#f0f0f0" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 5, padding: 12, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f46e5", animation: `bounce 1s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={sessionId ? "Ask anything about your notes..." : "Upload a file first"}
                disabled={!sessionId}
                style={{ flex: 1, padding: "13px 18px", background: "#13131f", border: "1px solid #2a2a3e", borderRadius: 12, color: "#f0f0f0", fontSize: 14, outline: "none" }} />
              <button onClick={sendMessage} disabled={!sessionId || loading}
                style={{ padding: "13px 26px", background: "#4f46e5", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                Send
              </button>
            </div>
          </>
        )}

        {activeTab !== "chat" && (
          <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24 }}>
            {loading ? (
              <p style={{ color: "#666", textAlign: "center", padding: 60, fontSize: 14 }}>Generating {outputType}...</p>
            ) : output ? (
              <>
                {activeTab === "flashcards" && <FlashcardView raw={output} />}
                {activeTab === "quiz" && <QuizView raw={output} />}
                {activeTab === "summarize" && <SummaryView text={output} onDownload={downloadSummary} />}
              </>
            ) : (
              <p style={{ color: "#333", textAlign: "center", padding: 60, fontSize: 14 }}>Click a button to generate content</p>
            )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        input::placeholder { color: #444; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 4px; }
      `}</style>
    </div>
  )
}