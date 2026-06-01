import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

/* ─── Flashcard view ─────────────────────────────────────── */
function FlashcardView({ raw }) {
  const cards = raw.split("---").map(c => c.trim()).filter(Boolean).map(card => {
    const f = card.match(/Front:\s*(.+)/i)
    const b = card.match(/Back:\s*([\s\S]+)/i)
    return { front: f?.[1] || card, back: b?.[1]?.trim() || "" }
  })
  const [flipped, setFlipped] = useState({})
  const [cur, setCur] = useState(0)
  const palettes = [
    { bg: "#1a1040", border: "#7c3aed", glow: "#7c3aed40", label: "#a78bfa" },
    { bg: "#1a0020", border: "#db2777", glow: "#db277740", label: "#f9a8d4" },
    { bg: "#001a10", border: "#059669", glow: "#05966940", label: "#6ee7b7" },
    { bg: "#1a1000", border: "#d97706", glow: "#d9770640", label: "#fcd34d" },
    { bg: "#001020", border: "#0284c7", glow: "#0284c740", label: "#7dd3fc" },
  ]
  const p = palettes[cur % palettes.length]
  const isFlipped = flipped[cur]

  return (
    

      
<div onClick={() => setFlipped(prev => ({ ...prev, [cur]: !prev[cur] }))}
        style={{
          cursor: "pointer", minHeight: 220, marginBottom: 24,
          background: isFlipped ? p.bg : "#0d0d14",
          border: `1.5px solid ${isFlipped ? p.border : "#222230"}`,
          borderRadius: 20, padding: "40px 32px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: "center", textAlign: "center",
          transition: "all 0.35s ease",
          boxShadow: isFlipped ? `0 0 48px ${p.glow}` : "none",
        }}>
        
          {isFlipped ? "answer" : "question"} · {cur + 1} / {cards.length}
        
        


          {isFlipped ? cards[cur].back : cards[cur].front}
        


        
          {isFlipped ? "tap to flip back" : "tap to reveal"}
        
      

      

         { setCur(c => Math.max(0, c - 1)); setFlipped({}) }}
          disabled={cur === 0}
          style={{ padding: "8px 22px", borderRadius: 10, border: "1.5px solid #222230", background: "transparent", color: cur === 0 ? "#33334a" : "#aaaacc", cursor: cur === 0 ? "default" : "pointer", fontSize: 14 }}>
          ← prev
        
        

          {cards.map((_, i) => (
            
 { setCur(i); setFlipped({}) }}
              style={{ width: i === cur ? 22 : 8, height: 8, borderRadius: 4, background: i === cur ? p.border : "#222230", cursor: "pointer", transition: "all 0.3s" }} />
          ))}
        

         { setCur(c => Math.min(cards.length - 1, c + 1)); setFlipped({}) }}
          disabled={cur === cards.length - 1}
          style={{ padding: "8px 22px", borderRadius: 10, border: "1.5px solid #222230", background: "transparent", color: cur === cards.length - 1 ? "#33334a" : "#aaaacc", cursor: cur === cards.length - 1 ? "default" : "pointer", fontSize: 14 }}>
          next →
        
      

    

  )
}

/* ─── Quiz view ──────────────────────────────────────────── */
function QuizView({ raw }) {
  const blocks = raw.split(/\n(?=Q\d*[:.])/i).map(b => b.trim()).filter(Boolean)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const doneCount = Object.keys(revealed).length
  const score = Object.keys(revealed).filter(i => {
    const lines = blocks[i].split("\n").map(l => l.trim()).filter(Boolean)
    const ans = lines.find(l => /^Answer:/i.test(l))?.replace(/Answer:/i, "").trim()
    return answers[i] === ans
  }).length
  const pct = blocks.length > 0 ? Math.round((score / blocks.length) * 100) : 0

  return (
    

      {doneCount === blocks.length && blocks.length > 0 && (
        

          


            {score === blocks.length ? "🏆 Perfect!" : score >= blocks.length * 0.7 ? "🎉 Great job!" : "📚 Keep studying!"}
          


          

{score} / {blocks.length} correct · {pct}%


          

            

          

        

      )}
      

        {blocks.map((block, i) => {
          const lines = block.split("\n").map(l => l.trim()).filter(Boolean)
          const question = lines[0].replace(/^Q\d*[:.]\s*/i, "")
          const options = lines.filter(l => /^[A-D]\)/i.test(l))
          const correct = lines.find(l => /^Answer:/i.test(l))?.replace(/Answer:/i, "").trim()
          return (
            

              

              


                Q{i + 1}.{question}
              


              

                {options.map((opt, j) => {
                  const letter = opt[0]
                  const sel = answers[i] === letter
                  const good = revealed[i] && letter === correct
                  const bad = revealed[i] && sel && letter !== correct
                  return (
                    
 !revealed[i] && setAnswers(p => ({ ...p, [i]: letter }))}
                      style={{
                        padding: "11px 16px", borderRadius: 10, fontSize: 14,
                        cursor: revealed[i] ? "default" : "pointer",
                        transition: "all 0.2s",
                        background: good ? "#041a0e" : bad ? "#1a0404" : sel ? "#120d24" : "#07070f",
                        border: `1.5px solid ${good ? "#059669" : bad ? "#dc2626" : sel ? "#7c3aed" : "#1a1a2e"}`,
                        color: good ? "#6ee7b7" : bad ? "#fca5a5" : sel ? "#c4b5fd" : "#7777aa",
                        transform: sel && !revealed[i] ? "translateX(5px)" : "none"
                      }}>
                      {opt}
                    

                  )
                })}
              

              {answers[i] && !revealed[i] && (
                 setRevealed(p => ({ ...p, [i]: true }))}
                  style={{ marginTop: 14, padding: "9px 20px", background: "#7c3aed", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  check answer
                
              )}
              {revealed[i] && (
                


                  {answers[i] === correct ? "✓ correct!" : `✗ answer was ${correct}`}
                


              )}
            

          )
        })}
      

    

  )
}

/* ─── Summary view ───────────────────────────────────────── */
function SummaryView({ text, onDownload }) {
  const lines = text.split("\n").filter(Boolean)
  const accents = ["#7c3aed", "#db2777", "#059669", "#d97706", "#0284c7"]
  return (
    

      
        ⬇ download summary
      
      

        {lines.map((line, i) => (
          

            {line}
          

        ))}
      

    

  )
}

/* ─── Pomodoro Timer ─────────────────────────────────────── */
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
              if (m === 0) { setRunning(false); clearInterval(ref.current); return mode === "work" ? 5 : 25 }
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
  const switchMode = m => { setMode(m); setRunning(false); setMinutes(m === "work" ? 25 : 5); setSeconds(0) }
  const total = (mode === "work" ? 25 : 5) * 60
  const pct = ((total - (minutes * 60 + seconds)) / total) * 100
  const r = 56, circ = 2 * Math.PI * r
  const color = mode === "work" ? "#7c3aed" : "#059669"

  return (
    

      

        {[["work", "⚡ focus"], ["break", "☕ break"]].map(([m, label]) => (
           switchMode(m)}
            style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${mode === m ? color : "#1a1a2e"}`, background: mode === m ? color + "22" : "transparent", color: mode === m ? color : "#55556a", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            {label}
          
        ))}
      

      

        
        

          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        

      

      

         setRunning(r => !r)}
          style={{ padding: "10px 28px", background: running ? "#dc262620" : color, border: running ? "1.5px solid #dc2626" : "none", borderRadius: 12, color: running ? "#f87171" : "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
          {running ? "⏸ pause" : "▶ start"}
        
        
          ↺ reset
        
      

    

  )
}

/* ─── Main App ───────────────────────────────────────────── */
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
  const [count, setCount] = useState(10)
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
      setSessions(prev => prev.find(s => s.id === sid) ? prev : [...prev, { id: sid, name: file.name }])
      setMessages([{ role: "assistant", text: `✅ "${file.name}" uploaded! Ask me anything about it.` }])
      setActiveTab("chat")
      setOutput("")
    } catch {
      setMessages([{ role: "assistant", text: "❌ Upload failed. Please try again." }])
    }
    setUploading(false)
  }

  const sendMessage = async () => {
    if (!question.trim() || !sessionId) return
    const q = question
    setMessages(prev => [...prev, { role: "user", text: q }])
    setQuestion("")
    setLoading(true)
    try {
      const res = await axios.post(`${API}/chat`, { session_id: sessionId, question: q })
      setMessages(prev => [...prev, { role: "assistant", text: res.data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "❌ Error. Please try again." }])
    }
    setLoading(false)
  }

  const doAction = async (action) => {
    if (!sessionId) return
    setLoading(true)
    setOutput("")
    setOutputType(action)
    setActiveTab(action)
    try {
      const res = await axios.post(`${API}/${action}`, { session_id: sessionId, count })
      const key = action === "summarize" ? "summary" : action === "quiz" ? "quiz" : "flashcards"
      setOutput(res.data[key])
    } catch {
      setOutput("Error generating content. Please try again.")
    }
    setLoading(false)
  }

  const downloadSummary = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([output], { type: "text/plain" }))
    a.download = "summary.txt"
    a.click()
  }

  const actionBtns = [
    { id: "summarize", label: "📝 summary", color: "#d97706" },
    { id: "quiz",      label: "🧠 quiz",    color: "#db2777" },
    { id: "flashcards",label: "🗂 flashcards", color: "#059669" },
  ]

  const s = {
    page: { minHeight: "100vh", background: "#07070f", color: "#eeeef5", fontFamily: "'Outfit', 'DM Sans', sans-serif" },
    wrap: { maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem", position: "relative", zIndex: 1 },
    card: { background: "#0d0d14", border: "1.5px solid #1a1a2e", borderRadius: 18, padding: 22 },
  }

  return (
    

      


      


        {/* Header */}
        

          

            

              
                AI Student
              
              

              Assistant
            

            

upload · chat · summarize · quiz · flashcards


          

           setShowTimer(t => !t)}
            style={{ padding: "9px 18px", background: showTimer ? "#7c3aed22" : "#0d0d14", border: `1.5px solid ${showTimer ? "#7c3aed" : "#1a1a2e"}`, borderRadius: 12, color: showTimer ? "#a78bfa" : "#55556a", cursor: "pointer", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
            ⏱ timer
          
        


        {showTimer && 
}

        {/* Count selector */}
        {sessionId && (
          

            questions / cards
            {[5, 10, 15, 20].map(n => (
               setCount(n)}
                style={{ padding: "5px 16px", borderRadius: 8, border: `1.5px solid ${count === n ? "#7c3aed" : "#1a1a2e"}`, background: count === n ? "#7c3aed22" : "transparent", color: count === n ? "#a78bfa" : "#44445a", cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all 0.2s" }}>
                {n}
              
            ))}
          

        )}

        {/* Upload + Action buttons */}
        

          

            {sessionId && 
}
            {!sessionId ? (
              

                
📄

                

upload a PDF or .txt file


                
                  {uploading ? "uploading..." : "choose file"}
                  
                
              

            ) : (
              

                

loaded files


                {sessions.map(s => (
                  
 setSessionId(s.id)}
                    style={{ padding: "9px 14px", borderRadius: 10, marginBottom: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.2s",
                      background: sessionId === s.id ? "#150d28" : "transparent",
                      border: `1.5px solid ${sessionId === s.id ? "#7c3aed" : "transparent"}`,
                      color: sessionId === s.id ? "#c4b5fd" : "#55556a" }}>
                    📄 {s.name}
                  

                ))}
                
                  + upload another
                  
                
              

            )}
          


          

            {actionBtns.map(btn => (
               doAction(btn.id)} disabled={!sessionId}
                style={{ padding: "12px 20px", borderRadius: 12, border: `1.5px solid ${activeTab === btn.id ? btn.color : "#1a1a2e"}`, cursor: sessionId ? "pointer" : "default", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", transition: "all 0.2s",
                  background: activeTab === btn.id ? btn.color + "20" : "#0d0d14",
                  color: !sessionId ? "#22223a" : activeTab === btn.id ? btn.color : "#44445a",
                  boxShadow: activeTab === btn.id ? `0 0 24px ${btn.color}30` : "none" }}>
                {btn.label}
              
            ))}
          

        


        {/* Tab row */}
        

          {[{ id: "chat", label: "💬 chat", color: "#7c3aed" }, output && { id: outputType, label: `${outputType === "summarize" ? "📝" : outputType === "quiz" ? "🧠" : "🗂"} ${outputType}`, color: "#db2777" }].filter(Boolean).map(tab => (
             setActiveTab(tab.id)}
              style={{ padding: "8px 20px", borderRadius: 10, border: `1.5px solid ${activeTab === tab.id ? tab.color : "#1a1a2e"}`, fontSize: 13, fontWeight: 700, cursor: "pointer", background: activeTab === tab.id ? tab.color + "20" : "#0d0d14", color: activeTab === tab.id ? tab.color : "#44445a", transition: "all 0.2s" }}>
              {tab.label}
            
          ))}
        


        {/* Chat */}
        {activeTab === "chat" && (
          <>
            

              {messages.length === 0 && (
                

                  
🎓

                  

upload a file to start chatting


                

              )}
              {messages.map((m, i) => (
                

                  

                    {m.text}
                  

                

              ))}
              {loading && (
                

                  {[0,1,2].map(i => 
)}
                

              )}
              

            

            

               setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={sessionId ? "ask anything about your notes..." : "upload a file first"}
                disabled={!sessionId}
                style={{ flex: 1, padding: "14px 20px", background: "#0d0d14", border: "1.5px solid #1a1a2e", borderRadius: 14, color: "#eeeef5", fontSize: 14, outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "#1a1a2e"} />
              
                send
              
            

          
        )}

        {/* Output panel */}
        {activeTab !== "chat" && (
          

            {loading ? (
              

                

                  {[0,1,2].map(i => 
)}
                

                

generating {count} {outputType === "flashcards" ? "flashcards" : outputType === "quiz" ? "questions" : "summary"}...


              

            ) : output ? (
              <>
                {activeTab === "flashcards" && }
                {activeTab === "quiz" && }
                {activeTab === "summarize" && }
              
            ) : (
              

click a button to generate content


            )}
          

        )}
      


      
    

  )
}