import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "https://ai-student-assistant-production-23a7.up.railway.app"

const COLORS = { purple: "#8b5cf6", pink: "#ec4899", green: "#10b981", amber: "#f59e0b", blue: "#3b82f6" }

function FlashcardView({ raw }) {
  const cards = raw.split("---").map(c => c.trim()).filter(Boolean).map(card => {
    const f = card.match(/Front:\s*(.+)/i)
    const b = card.match(/Back:\s*([\s\S]+)/i)
    return { front: f?.[1] || card, back: b?.[1]?.trim() || "" }
  })
  const [flipped, setFlipped] = useState({})
  const [cur, setCur] = useState(0)
  const cols = [COLORS.purple, COLORS.pink, COLORS.green, COLORS.amber, COLORS.blue]
  const col = cols[cur % cols.length]
  const isF = flipped[cur]
  return (
    <div>
      <div onClick={() => setFlipped(p => ({ ...p, [cur]: !p[cur] }))}
        style={{ cursor: "pointer", minHeight: 200, marginBottom: 20, background: isF ? `${col}15` : "#111118", border: `1.5px solid ${isF ? col : "#1e1e2e"}`, borderRadius: 20, padding: "36px 28px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", transition: "all 0.4s", boxShadow: isF ? `0 0 60px ${col}25` : "none" }}>
        <p style={{ fontSize: 11, color: isF ? col : "#444", marginBottom: 14, textTransform: "uppercase", letterSpacing: 2 }}>{isF ? "answer" : "question"} · {cur + 1}/{cards.length}</p>
        <p style={{ fontSize: 18, color: "#f0f0f5", lineHeight: 1.7, fontWeight: 500 }}>{isF ? cards[cur].back : cards[cur].front}</p>
        <p style={{ fontSize: 11, color: "#333", marginTop: 16 }}>tap to {isF ? "flip back" : "reveal"}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
        <button onClick={() => { setCur(c => Math.max(0, c-1)); setFlipped({}) }} disabled={cur===0}
          style={{ padding: "8px 20px", borderRadius: 10, border: "1.5px solid #1e1e2e", background: "transparent", color: cur===0?"#222":"#aaa", cursor: cur===0?"default":"pointer" }}>← prev</button>
        <div style={{ display: "flex", gap: 6 }}>
          {cards.map((_, i) => <div key={i} onClick={() => { setCur(i); setFlipped({}) }}
            style={{ width: i===cur?24:8, height: 8, borderRadius: 4, background: i===cur?col:"#1e1e2e", cursor: "pointer", transition: "all 0.3s" }} />)}
        </div>
        <button onClick={() => { setCur(c => Math.min(cards.length-1, c+1)); setFlipped({}) }} disabled={cur===cards.length-1}
          style={{ padding: "8px 20px", borderRadius: 10, border: "1.5px solid #1e1e2e", background: "transparent", color: cur===cards.length-1?"#222":"#aaa", cursor: cur===cards.length-1?"default":"pointer" }}>next →</button>
      </div>
    </div>
  )
}

function QuizView({ raw }) {
  const blocks = raw.split(/\n(?=Q\d*[:.])/i).map(b => b.trim()).filter(Boolean)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const score = Object.keys(revealed).filter(i => {
    const correct = blocks[i].split("\n").find(l => /^Answer:/i.test(l))?.replace(/Answer:/i,"").trim()
    return answers[i] === correct
  }).length
  return (
    <div>
      {Object.keys(revealed).length === blocks.length && blocks.length > 0 && (
        <div style={{ background: "#0a1f0a", border: "1.5px solid #10b981", borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "center" }}>
          <p style={{ fontSize: 28, marginBottom: 4 }}>{score === blocks.length ? "🏆" : score >= blocks.length * 0.7 ? "🎉" : "📚"}</p>
          <p style={{ color: "#10b981", fontSize: 20, fontWeight: 700 }}>{score} / {blocks.length} correct</p>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {blocks.map((block, i) => {
          const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
          const question = lines[0].replace(/^Q\d*[:.]\s*/i, "")
          const options = lines.filter(l => /^[A-D]\)/i.test(l))
          const correct = lines.find(l => /^Answer:/i.test(l))?.replace(/Answer:/i,"").trim()
          return (
            <div key={i} style={{ background: "#111118", border: "1.5px solid #1e1e2e", borderRadius: 16, padding: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 14, color: "#e0e0f0" }}>Q{i+1}. {question}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {options.map((opt, j) => {
                  const letter = opt[0], sel = answers[i]===letter
                  const good = revealed[i] && letter===correct, bad = revealed[i] && sel && letter!==correct
                  return (
                    <div key={j} onClick={() => !revealed[i] && setAnswers(p => ({ ...p, [i]: letter }))}
                      style={{ padding: "11px 16px", borderRadius: 10, cursor: revealed[i]?"default":"pointer", fontSize: 14, transition: "all 0.2s",
                        background: good?"#0a1f0a":bad?"#1f0a0a":sel?"#150d28":"#0a0a12",
                        border: `1.5px solid ${good?"#10b981":bad?"#ef4444":sel?"#8b5cf6":"#1e1e2e"}`,
                        color: good?"#6ee7b7":bad?"#fca5a5":sel?"#c4b5fd":"#666" }}>
                      {opt}
                    </div>
                  )
                })}
              </div>
              {answers[i] && !revealed[i] && (
                <button onClick={() => setRevealed(p => ({ ...p, [i]: true }))}
                  style={{ marginTop: 12, padding: "8px 18px", background: "#8b5cf6", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  check answer
                </button>
              )}
              {revealed[i] && (
                <p style={{ marginTop: 10, fontSize: 13, color: answers[i]===correct?"#10b981":"#ef4444" }}>
                  {answers[i]===correct ? "✓ correct!" : `✗ correct answer is ${correct}`}
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
        style={{ marginBottom: 16, padding: "8px 18px", background: "#111118", border: "1.5px solid #8b5cf6", borderRadius: 10, color: "#8b5cf6", cursor: "pointer", fontSize: 13 }}>
        ⬇ download summary
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ background: "#111118", borderLeft: `3px solid ${accents[i%accents.length]}`, borderRadius: "0 10px 10px 0", padding: "12px 18px", fontSize: 14, color: "#d0d0e8", lineHeight: 1.7 }}>
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
          if (s === 0) { setMinutes(m => { if (m === 0) { setRunning(false); return mode==="work"?5:25 } return m-1 }); return 59 }
          return s-1
        })
      }, 1000)
    } else clearInterval(ref.current)
    return () => clearInterval(ref.current)
  }, [running])
  const reset = () => { setRunning(false); setMinutes(mode==="work"?25:5); setSeconds(0) }
  const switchMode = m => { setMode(m); setRunning(false); setMinutes(m==="work"?25:5); setSeconds(0) }
  const total = (mode==="work"?25:5)*60, elapsed = total-(minutes*60+seconds)
  const pct = elapsed/total, r=52, circ=2*Math.PI*r, col=mode==="work"?COLORS.purple:COLORS.green
  return (
    <div style={{ background: "#111118", border: "1.5px solid #1e1e2e", borderRadius: 18, padding: 24, marginBottom: 20, textAlign: "center" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
        {[["work","⚡ focus"],["break","☕ break"]].map(([m,label]) => (
          <button key={m} onClick={() => switchMode(m)}
            style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${mode===m?col:"#1e1e2e"}`, background: mode===m?col+"22":"transparent", color: mode===m?col:"#444", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 20px" }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1e1e2e" strokeWidth="8"/>
          <circle cx="60" cy="60" r={r} fill="none" stroke={col} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} style={{ transition: "stroke-dashoffset 1s linear" }}/>
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 22, fontWeight: 700, color: "#f0f0f5" }}>
          {String(minutes).padStart(2,"0")}:{String(seconds).padStart(2,"0")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setRunning(r => !r)}
          style={{ padding: "9px 26px", background: running?"#1f0a0a":col, border: running?"1.5px solid #ef4444":"none", borderRadius: 12, color: running?"#ef4444":"#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
          {running ? "⏸ pause" : "▶ start"}
        </button>
        <button onClick={reset}
          style={{ padding: "9px 18px", background: "transparent", border: "1.5px solid #1e1e2e", borderRadius: 12, color: "#444", cursor: "pointer", fontSize: 14 }}>
          ↺
        </button>
      </div>
    </div>
  )
}

const FILE_TYPES = {
  "pdf": { icon: "📄", label: "PDF", accept: ".pdf" },
  "txt": { icon: "📝", label: "Text", accept: ".txt" },
  "docx": { icon: "📘", label: "Word", accept: ".docx" },
  "pptx": { icon: "📊", label: "PowerPoint", accept: ".pptx" },
  "png,jpg,jpeg": { icon: "🖼", label: "Image", accept: ".png,.jpg,.jpeg" },
  "csv": { icon: "📋", label: "CSV", accept: ".csv" },
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
  const [count, setCount] = useState(5)
  const chatEndRef = useRef(null)
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await axios.post(`${API}/upload`, form)
      const sid = res.data.session_id
      setSessionId(sid)
      setSessions(prev => prev.find(s => s.id===sid) ? prev : [...prev, { id: sid, name: file.name }])
      setMessages([{ role: "assistant", text: `✅ "${file.name}" uploaded! Ask me anything about it.` }])
      setActiveTab("chat"); setOutput("")
    } catch { setMessages([{ role: "assistant", text: "❌ Upload failed. Make sure the file type is supported." }]) }
    setUploading(false)
  }

  const sendMessage = async () => {
    if (!question.trim() || !sessionId) return
    const q = question
    setMessages(prev => [...prev, { role: "user", text: q }])
    setQuestion(""); setLoading(true)
    try {
      const res = await axios.post(`${API}/chat`, { session_id: sessionId, question: q })
      setMessages(prev => [...prev, { role: "assistant", text: res.data.answer }])
    } catch { setMessages(prev => [...prev, { role: "assistant", text: "❌ Error. Please try again." }]) }
    setLoading(false)
  }

  const doAction = async (action) => {
    if (!sessionId) return
    setLoading(true); setOutput(""); setOutputType(action); setActiveTab(action)
    try {
      const res = await axios.post(`${API}/${action}`, { session_id: sessionId, count })
      const key = action==="summarize"?"summary":action==="quiz"?"quiz":"flashcards"
      setOutput(res.data[key])
    } catch { setOutput("Error generating content.") }
    setLoading(false)
  }

  const downloadSummary = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([output], { type: "text/plain" }))
    a.download = "summary.txt"; a.click()
  }

  const accept = Object.values(FILE_TYPES).map(f => f.accept).join(",")

  return (
    <div style={{ minHeight: "100vh", background: "#07070f", color: "#eeeef5", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, background: "linear-gradient(135deg, #8b5cf6, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
              AI Student Assistant
            </h1>
            <p style={{ color: "#333", fontSize: 13 }}>upload · chat · summarize · quiz · flashcards</p>
          </div>
          <button onClick={() => setShowTimer(t => !t)}
            style={{ padding: "9px 16px", background: showTimer?"#8b5cf622":"#111118", border: `1.5px solid ${showTimer?"#8b5cf6":"#1e1e2e"}`, borderRadius: 12, color: showTimer?"#8b5cf6":"#444", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            ⏱ timer
          </button>
        </div>

        {showTimer && <Timer />}

        {/* Upload area */}
        <div style={{ background: "#111118", border: sessionId?"1.5px solid #8b5cf640":"1.5px dashed #1e1e2e", borderRadius: 18, padding: 24, marginBottom: 20 }}>
          {!sessionId ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>📚</p>
              <p style={{ color: "#444", marginBottom: 6, fontSize: 14 }}>Upload any study material</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
                {Object.values(FILE_TYPES).map(f => (
                  <span key={f.label} style={{ padding: "4px 12px", background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 20, fontSize: 12, color: "#555" }}>
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>
              <label style={{ cursor: "pointer", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", padding: "10px 28px", borderRadius: 10, fontSize: 14, color: "#fff", fontWeight: 700 }}>
                {uploading ? "uploading..." : "choose file"}
                <input type="file" accept={accept} onChange={uploadFile} style={{ display: "none" }} />
              </label>
            </div>
          ) : (
            <div>
              <p style={{ color: "#333", fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>loaded files</p>
              {sessions.map(s => (
                <div key={s.id} onClick={() => setSessionId(s.id)}
                  style={{ padding: "9px 14px", borderRadius: 10, marginBottom: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.2s", background: sessionId===s.id?"#150d28":"transparent", border: `1.5px solid ${sessionId===s.id?"#8b5cf6":"transparent"}`, color: sessionId===s.id?"#c4b5fd":"#555" }}>
                  📄 {s.name}
                </div>
              ))}
              <label style={{ cursor: "pointer", color: "#444", fontSize: 12, textDecoration: "underline", marginTop: 8, display: "inline-block" }}>
                + upload another
                <input type="file" accept={accept} onChange={uploadFile} style={{ display: "none" }} />
              </label>
            </div>
          )}
        </div>

        {/* Count + Action buttons */}
        {sessionId && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#333", fontSize: 12 }}>count:</span>
            {[5,10,15,20].map(n => (
              <button key={n} onClick={() => setCount(n)}
                style={{ padding: "5px 14px", borderRadius: 8, border: `1.5px solid ${count===n?"#8b5cf6":"#1e1e2e"}`, background: count===n?"#8b5cf622":"transparent", color: count===n?"#8b5cf6":"#333", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                {n}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {[{id:"summarize",label:"📝 Summary",col:COLORS.amber},{id:"quiz",label:"🧠 Quiz",col:COLORS.pink},{id:"flashcards",label:"🗂 Flashcards",col:COLORS.green}].map(btn => (
              <button key={btn.id} onClick={() => doAction(btn.id)}
                style={{ padding: "10px 18px", borderRadius: 12, border: `1.5px solid ${activeTab===btn.id?btn.col:"#1e1e2e"}`, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s", background: activeTab===btn.id?btn.col+"20":"#111118", color: activeTab===btn.id?btn.col:"#444", boxShadow: activeTab===btn.id?`0 0 20px ${btn.col}30`:"none" }}>
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setActiveTab("chat")}
            style={{ padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${activeTab==="chat"?"#8b5cf6":"#1e1e2e"}`, fontSize: 13, fontWeight: 700, cursor: "pointer", background: activeTab==="chat"?"#8b5cf622":"#111118", color: activeTab==="chat"?"#8b5cf6":"#444" }}>
            💬 chat
          </button>
          {output && (
            <button onClick={() => setActiveTab(outputType)}
              style={{ padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${activeTab===outputType?"#ec4899":"#1e1e2e"}`, fontSize: 13, fontWeight: 700, cursor: "pointer", background: activeTab===outputType?"#ec489922":"#111118", color: activeTab===outputType?"#ec4899":"#444", textTransform: "capitalize" }}>
              {outputType==="summarize"?"📝":outputType==="quiz"?"🧠":"🗂"} {outputType}
            </button>
          )}
        </div>

        {/* Chat */}
        {activeTab === "chat" && (
          <>
            <div style={{ background: "#111118", border: "1.5px solid #1e1e2e", borderRadius: 18, padding: 20, minHeight: 300, marginBottom: 14, overflowY: "auto", maxHeight: 420 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", marginTop: 80 }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>🎓</p>
                  <p style={{ color: "#222", fontSize: 14 }}>upload a file to start chatting</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 14, display: "flex", justifyContent: m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth: "78%", background: m.role==="user"?"#8b5cf6":"#1a1a28", padding: "12px 16px", borderRadius: m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", fontSize: 14, lineHeight: 1.7, color: "#f0f0f5" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 5, padding: 10 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", animation: `bounce 1s ${i*0.2}s infinite` }} />)}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key==="Enter" && sendMessage()}
                placeholder={sessionId?"ask anything about your notes...":"upload a file first"}
                disabled={!sessionId}
                style={{ flex: 1, padding: "13px 18px", background: "#111118", border: "1.5px solid #1e1e2e", borderRadius: 14, color: "#f0f0f5", fontSize: 14, outline: "none" }} />
              <button onClick={sendMessage} disabled={!sessionId||loading}
                style={{ padding: "13px 24px", background: "linear-gradient(135deg, #8b5cf6, #ec4899)", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                send
              </button>
            </div>
          </>
        )}

        {/* Output */}
        {activeTab !== "chat" && (
          <div style={{ background: "#111118", border: "1.5px solid #1e1e2e", borderRadius: 18, padding: 24 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6", animation: `bounce 1s ${i*0.2}s infinite` }} />)}
                </div>
                <p style={{ color: "#333", fontSize: 14 }}>generating {count} {outputType === "flashcards" ? "flashcards" : outputType === "quiz" ? "questions" : "summary"}...</p>
              </div>
            ) : output ? (
              <>
                {activeTab==="flashcards" && <FlashcardView raw={output} />}
                {activeTab==="quiz" && <QuizView raw={output} />}
                {activeTab==="summarize" && <SummaryView text={output} onDownload={downloadSummary} />}
              </>
            ) : (
              <p style={{ color: "#222", textAlign: "center", padding: 60, fontSize: 14 }}>click a button to generate</p>
            )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        input::placeholder { color: #333; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  )
}