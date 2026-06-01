import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const api = axios.create({ baseURL: API, timeout: 90000 })
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const P = {
  bg:      "#06060e",
  surface: "#0c0c18",
  raised:  "#111122",
  border:  "#1c1c30",
  purple:  "#7c5cbf",
  violet:  "#9d7fe0",
  pink:    "#c45c8a",
  rose:    "#e07a9d",
  green:   "#3d9e6e",
  teal:    "#2e8b7a",
  amber:   "#b87c2e",
  blue:    "#3a6dbf",
  red:     "#bf4545",
  text:    "#e8e8f0",
  muted:   "#55556e",
  dim:     "#2a2a40",
}

const TAG_COLORS = [P.purple,P.pink,P.green,P.amber,P.blue,P.teal,P.rose]

const fileIcon = name => {
  if (!name) return "📄"
  const e = name.split(".").pop().toLowerCase()
  return { pdf:"📕", docx:"📘", pptx:"📊", png:"🖼", jpg:"🖼", jpeg:"🖼", webp:"🖼", csv:"📋", txt:"📄", md:"📄" }[e] || "📄"
}

function FlashcardView({ raw }) {
  const cards = raw.split("---").map(c => c.trim()).filter(Boolean).map(card => ({
    front: card.match(/Front:\s*(.+)/i)?.[1] || card,
    back:  card.match(/Back:\s*([\s\S]+)/i)?.[1]?.trim() || ""
  }))
  const [cur, setCur]       = useState(0)
  const [flipped, setFlip]  = useState(false)
  const [streak, setStreak] = useState(0)
  const col = TAG_COLORS[cur % TAG_COLORS.length]

  const next = () => { setCur(c => Math.min(cards.length-1, c+1)); setFlip(false) }
  const prev = () => { setCur(c => Math.max(0, c-1)); setFlip(false) }
  const handleKnew = () => { setStreak(s => s+1); next() }
  const handleSkip = () => { setStreak(0); next() }

  if (!cards.length) return null
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={{ fontSize:12, color:P.muted, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600 }}>
          card {cur+1} of {cards.length}
        </span>
        <span style={{ fontSize:12, color: streak>0 ? P.green : P.muted, fontWeight:700 }}>
          {streak>0 ? `🔥 ${streak} streak` : "tap to flip"}
        </span>
      </div>
      <div style={{ height:3, background:P.dim, borderRadius:2, marginBottom:24, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${((cur+1)/cards.length)*100}%`, background:`linear-gradient(90deg,${col},${P.violet})`, borderRadius:2, transition:"width 0.4s ease" }} />
      </div>
      <div onClick={() => setFlip(f => !f)} style={{
        cursor:"pointer", minHeight:220, marginBottom:20,
        background: flipped ? `linear-gradient(145deg, ${col}18, ${P.surface})` : P.surface,
        border:`1.5px solid ${flipped ? col+"66" : P.border}`,
        borderRadius:20, padding:"44px 36px",
        display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", textAlign:"center",
        transition:"all 0.4s cubic-bezier(.4,0,.2,1)",
        boxShadow: flipped ? `0 0 60px ${col}18, inset 0 1px 0 ${col}22` : `0 4px 32px rgba(0,0,0,.4)`,
        position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:flipped ? `linear-gradient(90deg,transparent,${col},transparent)` : "transparent", transition:"all 0.4s" }} />
        <p style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase", color: flipped ? col : P.muted, marginBottom:20 }}>
          {flipped ? "answer" : "question"}
        </p>
        <p style={{ fontSize:18, color:P.text, lineHeight:1.75, fontWeight:500, maxWidth:"88%" }}>
          {flipped ? cards[cur].back : cards[cur].front}
        </p>
        <p style={{ fontSize:11, color:P.dim, marginTop:20 }}>{flipped ? "tap to go back" : "tap to reveal"}</p>
      </div>
      {flipped && (
        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
          <button onClick={handleSkip} style={{ flex:1, padding:"12px", borderRadius:14, border:`1.5px solid ${P.red}44`, background:`${P.red}10`, color:P.red, cursor:"pointer", fontSize:13, fontWeight:700 }}>
            ✗ still learning
          </button>
          <button onClick={handleKnew} style={{ flex:1, padding:"12px", borderRadius:14, border:`1.5px solid ${P.green}44`, background:`${P.green}10`, color:P.green, cursor:"pointer", fontSize:13, fontWeight:700 }}>
            ✓ got it
          </button>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:14 }}>
        <button onClick={prev} disabled={cur===0}
          style={{ padding:"9px 22px", borderRadius:10, border:`1.5px solid ${P.border}`, background:"transparent", color:cur===0?P.dim:"#aaa", cursor:cur===0?"default":"pointer", fontSize:14 }}>
          ← prev
        </button>
        <div style={{ display:"flex", gap:5 }}>
          {cards.map((_,i) => (
            <div key={i} onClick={() => { setCur(i); setFlip(false) }}
              style={{ width:i===cur?24:7, height:7, borderRadius:4, background:i===cur?col:P.dim, cursor:"pointer", transition:"all 0.3s" }} />
          ))}
        </div>
        <button onClick={next} disabled={cur===cards.length-1}
          style={{ padding:"9px 22px", borderRadius:10, border:`1.5px solid ${P.border}`, background:"transparent", color:cur===cards.length-1?P.dim:"#aaa", cursor:cur===cards.length-1?"default":"pointer", fontSize:14 }}>
          next →
        </button>
      </div>
    </div>
  )
}

function QuizView({ raw }) {
  const blocks = raw.split(/\n(?=Q\d*[:.])/i).map(b => b.trim()).filter(Boolean)
  const [answers, setAnswers]   = useState({})
  const [revealed, setRevealed] = useState({})
  const [timeSpent, setTime]    = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setTime(t => t+1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const done = Object.keys(revealed).length === blocks.length && blocks.length > 0
  useEffect(() => { if (done) clearInterval(timerRef.current) }, [done])

  const score = Object.keys(revealed).filter(i => {
    const correct = blocks[i].split("\n").find(l => /^Answer:/i.test(l))?.replace(/Answer:/i,"").trim()
    return answers[i] === correct
  }).length

  const pct = blocks.length ? Math.round(score/blocks.length*100) : 0
  const mins = Math.floor(timeSpent/60), secs = timeSpent%60

  return (
    <div>
      {done && (
        <div style={{ background:`linear-gradient(135deg,${P.surface},${P.raised})`, border:`1.5px solid ${pct>=70?P.green+"44":P.red+"44"}`, borderRadius:20, padding:28, marginBottom:28, textAlign:"center" }}>
          <p style={{ fontSize:48, marginBottom:8 }}>{pct===100?"🏆":pct>=70?"🎉":"📚"}</p>
          <p style={{ fontSize:28, fontWeight:800, color:pct>=70?P.green:P.rose, marginBottom:4 }}>{score}/{blocks.length}</p>
          <p style={{ color:P.muted, fontSize:14, marginBottom:16 }}>{pct}% correct · {mins}m {secs}s</p>
          <div style={{ height:8, background:P.dim, borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${P.green},${P.teal})`, borderRadius:4, transition:"width 1.2s ease" }} />
          </div>
          <p style={{ color:P.muted, fontSize:13, marginTop:12 }}>
            {pct===100?"Perfect! You know this material cold.":pct>=70?"Solid work! Review the ones you missed.":"Keep studying — you'll get it!"}
          </p>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {blocks.map((block, i) => {
          const lines   = block.split("\n").map(l=>l.trim()).filter(Boolean)
          const q       = lines[0].replace(/^Q\d*[:.]\s*/i,"")
          const options = lines.filter(l => /^[A-D]\)/i.test(l))
          const correct = lines.find(l => /^Answer:/i.test(l))?.replace(/Answer:/i,"").trim()
          const sel     = answers[i]
          const rev     = revealed[i]
          return (
            <div key={i} style={{ background:P.surface, border:`1.5px solid ${P.border}`, borderRadius:18, padding:"22px 24px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:`linear-gradient(180deg,${P.purple},${P.pink})`, borderRadius:"18px 0 0 18px" }} />
              <p style={{ fontWeight:700, color:P.text, fontSize:15, marginBottom:16, paddingLeft:12, lineHeight:1.6 }}>
                <span style={{ color:P.violet, marginRight:8, fontFamily:"monospace" }}>Q{i+1}.</span>{q}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {options.map((opt, j) => {
                  const letter = opt[0]
                  const isGood = rev && letter===correct
                  const isBad  = rev && sel===letter && letter!==correct
                  const isSel  = sel===letter
                  return (
                    <div key={j} onClick={() => !rev && setAnswers(p=>({...p,[i]:letter}))}
                      style={{
                        padding:"12px 18px", borderRadius:12, fontSize:14, fontWeight:500,
                        cursor:rev?"default":"pointer", transition:"all 0.2s",
                        background:isGood?`${P.green}14`:isBad?`${P.red}14`:isSel?`${P.purple}14`:"transparent",
                        border:`1.5px solid ${isGood?P.green+"66":isBad?P.red+"66":isSel?P.purple+"66":P.border}`,
                        color:isGood?P.green:isBad?"#e07a7a":isSel?P.violet:P.muted,
                        transform:isSel&&!rev?"translateX(6px)":"none"
                      }}>
                      {opt}
                      {isGood && <span style={{ float:"right" }}>✓</span>}
                      {isBad  && <span style={{ float:"right" }}>✗</span>}
                    </div>
                  )
                })}
              </div>
              {sel && !rev && (
                <button onClick={() => setRevealed(p=>({...p,[i]:true}))}
                  style={{ marginTop:14, padding:"9px 20px", background:`linear-gradient(135deg,${P.purple},${P.pink})`, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>
                  check answer
                </button>
              )}
              {rev && (
                <p style={{ marginTop:12, fontSize:13, fontWeight:700, color:sel===correct?P.green:P.rose }}>
                  {sel===correct ? "✓ that's right!" : `✗ it was ${correct}`}
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
        style={{ marginBottom:20, padding:"9px 20px", background:"transparent", border:`1.5px solid ${P.purple}66`, borderRadius:10, color:P.violet, cursor:"pointer", fontSize:13, fontWeight:600 }}>
        ⬇ save as text
      </button>
      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ background:P.surface, borderLeft:`3px solid ${TAG_COLORS[i%TAG_COLORS.length]}`, borderRadius:"0 12px 12px 0", padding:"13px 18px", fontSize:14, color:"#cccde0", lineHeight:1.85 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

function RichView({ text, accentColor }) {
  const col = accentColor || P.purple
  const lines = text.split("\n").filter(Boolean)
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {lines.map((line, i) => {
        const isHeading = /^#{1,3}\s/.test(line) || /^[A-Z][^a-z]{8,}$/.test(line.trim())
        const isBullet  = /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line)
        const isSubhead = line.trim().endsWith(":") && line.length < 60
        return (
          <div key={i} style={{
            padding: isHeading ? "14px 18px" : isBullet ? "10px 18px 10px 32px" : "10px 18px",
            background: isHeading ? `${col}12` : isSubhead ? P.raised : P.surface,
            borderLeft: isHeading ? `3px solid ${col}` : isBullet ? `2px solid ${col}33` : "none",
            borderRadius: isHeading ? "0 12px 12px 0" : "10px",
            fontSize: isHeading ? 15 : 14,
            fontWeight: isHeading||isSubhead ? 700 : 400,
            color: isHeading ? P.text : isSubhead ? P.violet : "#cccde0",
            lineHeight: 1.8, position:"relative"
          }}>
            {isBullet && <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", width:5, height:5, borderRadius:"50%", background:col }} />}
            {line.replace(/^[-*•]\s/, "").replace(/^#{1,3}\s/, "")}
          </div>
        )
      })}
    </div>
  )
}

function Timer() {
  const [mins, setMins]         = useState(25)
  const [secs, setSecs]         = useState(0)
  const [running, setRunning]   = useState(false)
  const [mode, setMode]         = useState("work")
  const [sessions, setSessions] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecs(s => {
          if (s===0) {
            setMins(m => {
              if (m===0) {
                setRunning(false)
                clearInterval(ref.current)
                if (mode==="work") setSessions(n=>n+1)
                return mode==="work"?5:25
              }
              return m-1
            })
            return 59
          }
          return s-1
        })
      }, 1000)
    } else clearInterval(ref.current)
    return () => clearInterval(ref.current)
  }, [running, mode])

  const reset = () => { setRunning(false); setMins(mode==="work"?25:5); setSecs(0) }
  const switchMode = m => { setMode(m); setRunning(false); setMins(m==="work"?25:5); setSecs(0) }
  const total = (mode==="work"?25:5)*60
  const pct   = (total-(mins*60+secs))/total
  const r = 58, circ = 2*Math.PI*r
  const col = mode==="work" ? P.purple : P.green

  return (
    <div style={{ background:P.surface, border:`1.5px solid ${P.border}`, borderRadius:22, padding:28, marginBottom:24, display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {[["work","⚡ focus"],["break","☕ break"]].map(([m,label]) => (
          <button key={m} onClick={() => switchMode(m)}
            style={{ padding:"7px 20px", borderRadius:10, border:`1.5px solid ${mode===m?col:P.border}`, background:mode===m?`${col}18`:"transparent", color:mode===m?col:P.muted, cursor:"pointer", fontSize:13, fontWeight:700 }}>
            {label}
          </button>
        ))}
        {sessions>0 && <span style={{ padding:"7px 14px", borderRadius:10, background:`${P.amber}14`, color:P.amber, fontSize:12, fontWeight:700 }}>🍅 {sessions}</span>}
      </div>
      <div style={{ position:"relative", width:144, height:144, marginBottom:24 }}>
        <svg width="144" height="144" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="72" cy="72" r={r} fill="none" stroke={P.dim} strokeWidth="9" />
          <circle cx="72" cy="72" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
            style={{ transition:"stroke-dashoffset 1s linear, stroke 0.4s" }} />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:28, fontWeight:800, color:P.text, letterSpacing:-1, fontFamily:"monospace" }}>
            {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
          </span>
          <span style={{ fontSize:11, color:P.muted, textTransform:"uppercase", letterSpacing:1.5, marginTop:2 }}>
            {mode==="work"?"focus":"break"}
          </span>
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={() => setRunning(r=>!r)}
          style={{ padding:"11px 30px", background:running?`${P.red}18`:`linear-gradient(135deg,${col},${mode==="work"?P.pink:P.teal})`, border:running?`1.5px solid ${P.red}44`:"none", borderRadius:12, color:running?"#e07a7a":"#fff", cursor:"pointer", fontSize:14, fontWeight:700 }}>
          {running?"⏸ pause":"▶ start"}
        </button>
        <button onClick={reset}
          style={{ padding:"11px 18px", background:"transparent", border:`1.5px solid ${P.border}`, borderRadius:12, color:P.muted, cursor:"pointer", fontSize:14 }}>
          ↺
        </button>
      </div>
    </div>
  )
}

function AuthModal({ onClose, onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [form, setForm]         = useState({ username:"", email:"", password:"" })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const submit = async e => {
    e.preventDefault(); setLoading(true); setError("")
    try {
      if (isSignup) {
        const r = await api.post("/signup", form)
        localStorage.setItem("token", r.data.access_token)
      } else {
        const fd = new URLSearchParams()
        fd.append("username", form.username)
        fd.append("password", form.password)
        const r = await api.post("/token", fd, { headers:{"Content-Type":"application/x-www-form-urlencoded"} })
        localStorage.setItem("token", r.data.access_token)
      }
      onLogin(); onClose()
    } catch(err) { setError(err.response?.data?.detail||"Something went wrong") }
    setLoading(false)
  }

  const inp = { width:"100%", padding:"13px 16px", marginBottom:12, background:P.raised, border:`1.5px solid ${P.border}`, borderRadius:12, color:P.text, fontSize:14, outline:"none" }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(6,6,14,.88)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:1000, backdropFilter:"blur(8px)" }}>
      <div style={{ background:P.surface, border:`1.5px solid ${P.border}`, borderRadius:24, padding:40, width:"92%", maxWidth:400, boxShadow:`0 32px 80px rgba(0,0,0,.6)` }}>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:6, color:P.text }}>{isSignup?"Create account":"Welcome back"}</h2>
        <p style={{ fontSize:13, color:P.muted, marginBottom:28 }}>{isSignup?"Join thousands of students":"Log in to save your progress"}</p>
        <form onSubmit={submit}>
          <input value={form.username} onChange={set("username")} placeholder="Username" required style={inp} />
          {isSignup && <input value={form.email} onChange={set("email")} placeholder="Email" type="email" required style={inp} />}
          <input value={form.password} onChange={set("password")} placeholder="Password" type="password" required style={{...inp,marginBottom:20}} />
          {error && <p style={{ color:"#e07a7a", fontSize:13, marginBottom:12 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"14px", background:`linear-gradient(135deg,${P.purple},${P.pink})`, border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>
            {loading?"just a sec...":isSignup?"Create account →":"Log in →"}
          </button>
        </form>
        <p style={{ textAlign:"center", marginTop:18, color:P.muted, fontSize:13 }}>
          {isSignup?"Already have an account? ":"Don't have one? "}
          <span onClick={()=>setIsSignup(!isSignup)} style={{ color:P.violet, cursor:"pointer", fontWeight:600 }}>
            {isSignup?"Log in":"Sign up"}
          </span>
        </p>
        <button onClick={onClose} style={{ marginTop:14, width:"100%", padding:"10px", background:"transparent", border:`1.5px solid ${P.border}`, borderRadius:12, color:P.muted, cursor:"pointer", fontSize:13 }}>
          continue as guest
        </button>
      </div>
    </div>
  )
}

const FEATURES = [
  { id:"summarize",      label:"Summary",        icon:"📝", color:P.amber,  desc:"Key points"        },
  { id:"quiz",           label:"Quiz",           icon:"🧠", color:P.pink,   desc:"MCQ test"           },
  { id:"flashcards",     label:"Flashcards",     icon:"🗂", color:P.green,  desc:"Study cards"        },
  { id:"exam_predictor", label:"Exam Predictor", icon:"🔮", color:P.violet, desc:"Likely questions"   },
  { id:"study_plan",     label:"Study Plan",     icon:"📅", color:P.blue,   desc:"7-day schedule"     },
  { id:"key_terms",      label:"Key Terms",      icon:"🔑", color:P.teal,   desc:"Definitions"        },
  { id:"mind_map",       label:"Mind Map",       icon:"🌳", color:P.green,  desc:"Visual structure"   },
  { id:"eli5",           label:"ELI5",           icon:"👶", color:P.amber,  desc:"Simple explanation" },
  { id:"formula_sheet",  label:"Formulas",       icon:"📐", color:P.blue,   desc:"Math & science"     },
  { id:"chapter_summary",label:"Chapters",       icon:"📖", color:P.purple, desc:"Section by section" },
  { id:"simplify_words", label:"Simplify",       icon:"🎯", color:P.teal,   desc:"Plain language"     },
  { id:"fill_blanks",    label:"Fill Blanks",    icon:"🕳", color:P.violet, desc:"Complete sentences" },
  { id:"true_false",     label:"True/False",     icon:"✅", color:P.green,  desc:"Fact checking"      },
  { id:"short_answer",   label:"Short Answer",   icon:"✏️", color:P.pink,   desc:"Brief responses"    },
  { id:"debate",         label:"Debate",         icon:"🎭", color:P.rose,   desc:"Both sides"         },
  { id:"essay_grade",    label:"Essay Grade",    icon:"✍️", color:P.amber,  desc:"Grade & feedback"   },
  { id:"homework_help",  label:"Homework",       icon:"📚", color:P.blue,   desc:"Step-by-step help"  },
  { id:"compare",        label:"Compare Docs",   icon:"⚖️", color:P.rose,   desc:"Two documents"      },
]

const ACCEPT = ".pdf,.txt,.md,.docx,.pptx,.jpg,.jpeg,.png,.webp,.csv"

export default function App() {
  const [sessions, setSessions]   = useState([])
  const [sessionId, setSessionId] = useState("")
  const [messages, setMessages]   = useState([])
  const [question, setQuestion]   = useState("")
  const [output, setOutput]       = useState("")
  const [outputType, setType]     = useState("")
  const [loading, setLoading]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [showTimer, setShowTimer] = useState(false)
  const [count, setCount]         = useState(10)
  const [dragOver, setDragOver]   = useState(false)
  const [online, setOnline]       = useState(false)
  const [user, setUser]           = useState(null)
  const [showAuth, setShowAuth]   = useState(false)
  const [savedItems, setSaved]    = useState([])
  const [showSaved, setShowSaved] = useState(false)
  const [essayText, setEssay]     = useState("")
  const [hwQ, setHwQ]             = useState("")
  const [hwSubject, setHwSub]     = useState("general")
  const [eli5Topic, setEli5]      = useState("")
  const [debateTopic, setDebate]  = useState("")
  const [compareId, setCompare]   = useState("")
  const chatEndRef = useRef(null)
  const fileRef    = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages])

  useEffect(() => {
    const ping = () => api.get("/").then(()=>setOnline(true)).catch(()=>setOnline(false))
    ping()
    const t = setInterval(ping, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (localStorage.getItem("token")) {
      api.get("/me").then(r=>setUser(r.data)).catch(()=>localStorage.removeItem("token"))
    }
  }, [])

  useEffect(() => { if (user) api.get("/saved").then(r=>setSaved(r.data)).catch(()=>{}) }, [user])

  const processFile = useCallback(async file => {
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await api.post("/upload", form)
      if (res.data.error) { setMessages([{role:"assistant",text:`❌ ${res.data.error}`}]); setUploading(false); return }
      const sid = res.data.session_id
      setSessionId(sid)
      setSessions(p => p.find(s=>s.id===sid) ? p : [...p, { id:sid, name:file.name }])
      setMessages([{role:"assistant",text:`✅ "${file.name}" uploaded! Ask me anything about it.`}])
      setActiveTab("chat"); setOutput("")
    } catch { setMessages([{role:"assistant",text:"❌ Upload failed. Please try again."}]) }
    setUploading(false)
  }, [])

  const onFileChange = e => { processFile(e.target.files[0]); e.target.value="" }
  const onDrop = e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }

  const sendMessage = async () => {
    if (!question.trim() || !sessionId) return
    const q = question
    setMessages(p => [...p, {role:"user",text:q}])
    setQuestion(""); setLoading(true)
    try {
      const res = await api.post("/chat", { session_id:sessionId, question:q })
      setMessages(p => [...p, {role:"assistant",text:res.data.answer}])
    } catch { setMessages(p => [...p, {role:"assistant",text:"❌ Error. Please try again."}]) }
    setLoading(false)
  }

  const doAction = async action => {
    if (!sessionId && action!=="compare") return
    setLoading(true); setOutput(""); setType(action); setActiveTab(action)
    try {
      let res
      if      (action==="compare")       res = await api.post("/compare",       { session_id_1:sessionId, session_id_2:compareId })
      else if (action==="essay_grade")   res = await api.post("/essay_grade",   { session_id:sessionId, essay_text:essayText })
      else if (action==="homework_help") res = await api.post("/homework_help", { session_id:sessionId, question:hwQ, subject:hwSubject })
      else if (action==="eli5")          res = await api.post("/eli5",          { session_id:sessionId, topic:eli5Topic })
      else if (action==="debate")        res = await api.post("/debate",        { session_id:sessionId, topic:debateTopic })
      else                               res = await api.post(`/${action}`,     { session_id:sessionId, count })
      const keys = { summarize:"summary", quiz:"quiz", flashcards:"flashcards", exam_predictor:"exam_predictor", study_plan:"study_plan", key_terms:"key_terms", mind_map:"mind_map", eli5:"eli5", compare:"compare", essay_grade:"essay_grade", homework_help:"homework_help", formula_sheet:"formula_sheet", chapter_summary:"chapter_summary", simplify_words:"simplify_words", fill_blanks:"fill_blanks", true_false:"true_false", short_answer:"short_answer", debate:"debate" }
      setOutput(res.data[keys[action]] || "")
    } catch(err) { setOutput("❌ " + (err.response?.data?.detail || err.message || "Error. Try again.")) }
    setLoading(false)
  }

  const saveOutput = async () => {
    if (!user) { setShowAuth(true); return }
    try {
      await api.post("/save", { type:outputType, title:`${outputType} · ${sessionId}`, content:output, session_id:sessionId })
      api.get("/saved").then(r=>setSaved(r.data))
      const t = document.createElement("div")
      t.textContent = "✓ saved!"
      Object.assign(t.style, { position:"fixed", bottom:"24px", right:"24px", padding:"12px 22px", background:P.green, color:"#fff", borderRadius:"12px", fontWeight:700, zIndex:9999, fontSize:"14px" })
      document.body.appendChild(t)
      setTimeout(() => t.remove(), 2000)
    } catch {}
  }

  const download = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([output], {type:"text/plain"}))
    a.download = `${outputType}.txt`; a.click()
  }

  const renderInputPanel = () => {
    if (outputType==="essay_grade") return (
      <div style={{ marginBottom:20 }}>
        <p style={{ color:P.muted, fontSize:13, marginBottom:10 }}>paste your essay below then click grade:</p>
        <textarea value={essayText} onChange={e=>setEssay(e.target.value)} placeholder="Your essay here..."
          style={{ width:"100%", minHeight:180, padding:16, background:P.raised, border:`1.5px solid ${P.border}`, borderRadius:14, color:P.text, fontSize:14, lineHeight:1.75, resize:"vertical", outline:"none" }} />
        <button onClick={()=>doAction("essay_grade")}
          style={{ marginTop:12, padding:"12px 26px", background:`linear-gradient(135deg,${P.amber},${P.pink})`, border:"none", borderRadius:12, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700 }}>
          ✍️ grade my essay
        </button>
      </div>
    )
    if (outputType==="homework_help") return (
      <div style={{ marginBottom:20 }}>
        <input value={hwSubject} onChange={e=>setHwSub(e.target.value)} placeholder="Subject (Math, Physics…)"
          style={{ width:"100%", padding:"12px 16px", marginBottom:10, background:P.raised, border:`1.5px solid ${P.border}`, borderRadius:12, color:P.text, fontSize:14, outline:"none" }} />
        <textarea value={hwQ} onChange={e=>setHwQ(e.target.value)} placeholder="Paste your question here..."
          style={{ width:"100%", minHeight:110, padding:16, background:P.raised, border:`1.5px solid ${P.border}`, borderRadius:14, color:P.text, fontSize:14, lineHeight:1.75, resize:"vertical", outline:"none" }} />
        <button onClick={()=>doAction("homework_help")}
          style={{ marginTop:12, padding:"12px 26px", background:`linear-gradient(135deg,${P.blue},${P.violet})`, border:"none", borderRadius:12, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700 }}>
          📚 help me solve this
        </button>
      </div>
    )
    if (outputType==="eli5") return (
      <div style={{ marginBottom:20 }}>
        <input value={eli5Topic} onChange={e=>setEli5(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAction("eli5")} placeholder="What should I explain simply?"
          style={{ width:"100%", padding:"13px 18px", marginBottom:12, background:P.raised, border:`1.5px solid ${P.border}`, borderRadius:12, color:P.text, fontSize:14, outline:"none" }} />
        <button onClick={()=>doAction("eli5")}
          style={{ padding:"12px 26px", background:`linear-gradient(135deg,${P.amber},${P.rose})`, border:"none", borderRadius:12, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700 }}>
          👶 explain it simply
        </button>
      </div>
    )
    if (outputType==="debate") return (
      <div style={{ marginBottom:20 }}>
        <input value={debateTopic} onChange={e=>setDebate(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAction("debate")} placeholder="Topic to debate…"
          style={{ width:"100%", padding:"13px 18px", marginBottom:12, background:P.raised, border:`1.5px solid ${P.border}`, borderRadius:12, color:P.text, fontSize:14, outline:"none" }} />
        <button onClick={()=>doAction("debate")}
          style={{ padding:"12px 26px", background:`linear-gradient(135deg,${P.rose},${P.red})`, border:"none", borderRadius:12, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700 }}>
          🎭 debate both sides
        </button>
      </div>
    )
    if (outputType==="compare") return (
      <div style={{ marginBottom:20 }}>
        <p style={{ color:P.muted, fontSize:13, marginBottom:12 }}>pick a second document to compare with:</p>
        {sessions.filter(s=>s.id!==sessionId).map(s => (
          <div key={s.id} onClick={()=>setCompare(s.id)}
            style={{ padding:"12px 16px", borderRadius:12, marginBottom:8, cursor:"pointer", background:compareId===s.id?`${P.pink}12`:P.raised, border:`1.5px solid ${compareId===s.id?P.pink+"66":P.border}`, color:compareId===s.id?P.rose:P.muted }}>
            {fileIcon(s.name)} {s.name} {compareId===s.id&&"✓"}
          </div>
        ))}
        {sessions.filter(s=>s.id!==sessionId).length===0 && <p style={{ color:P.dim, fontSize:13 }}>upload another file first</p>}
        {compareId && (
          <button onClick={()=>doAction("compare")}
            style={{ marginTop:12, padding:"12px 26px", background:`linear-gradient(135deg,${P.pink},${P.violet})`, border:"none", borderRadius:12, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700 }}>
            ⚖️ compare now
          </button>
        )}
      </div>
    )
    return null
  }

  const renderOutput = () => {
    if (!output) return <p style={{ color:P.dim, textAlign:"center", padding:60, fontSize:14 }}>click a button to generate</p>
    if (output.startsWith("❌")) return (
      <div style={{ textAlign:"center", padding:40 }}>
        <p style={{ color:"#e07a7a", fontSize:15, lineHeight:1.8, marginBottom:24 }}>{output}</p>
        <button onClick={()=>doAction(outputType)}
          style={{ padding:"12px 26px", background:`linear-gradient(135deg,${P.purple},${P.pink})`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          ↺ try again
        </button>
      </div>
    )
    const feat = FEATURES.find(f=>f.id===outputType)
    return (
      <div>
        {outputType==="flashcards" && <FlashcardView raw={output} />}
        {outputType==="quiz"       && <QuizView raw={output} />}
        {outputType==="summarize"  && <SummaryView text={output} onDownload={download} />}
        {!["flashcards","quiz","summarize"].includes(outputType) && <RichView text={output} accentColor={feat?.color} />}
        <div style={{ display:"flex", gap:10, marginTop:24, flexWrap:"wrap" }}>
          <button onClick={download}
            style={{ padding:"9px 18px", background:"transparent", border:`1.5px solid ${P.border}`, borderRadius:10, color:P.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>
            ⬇ download
          </button>
          {user && (
            <button onClick={saveOutput}
              style={{ padding:"9px 18px", background:`${P.green}12`, border:`1.5px solid ${P.green}44`, borderRadius:10, color:P.green, cursor:"pointer", fontSize:13, fontWeight:600 }}>
              💾 save to account
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:"100vh", background:P.bg, color:P.text, fontFamily:"'Outfit','DM Sans',sans-serif" }}>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, background:"radial-gradient(ellipse at 10% 10%, #7c5cbf0a 0%,transparent 50%), radial-gradient(ellipse at 90% 90%, #c45c8a08 0%,transparent 50%)" }} />

      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onLogin={()=>api.get("/me").then(r=>setUser(r.data))} />}

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"2rem 1.5rem", position:"relative", zIndex:1 }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:36, gap:16, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize:34, fontWeight:900, letterSpacing:-1.5, lineHeight:1, marginBottom:8 }}>
              <span style={{ background:`linear-gradient(135deg,${P.violet},${P.rose},#e0a060)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>AI Student</span>
              <br /><span style={{ color:P.text }}>Assistant</span>
            </h1>
            <p style={{ color:P.muted, fontSize:13, letterSpacing:0.4 }}>pdf · docx · pptx · images · 20+ study tools</p>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:online?`${P.green}10`:`${P.red}10`, border:`1px solid ${online?P.green+"33":P.red+"33"}` }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:online?P.green:P.red, display:"inline-block" }} />
              <span style={{ fontSize:12, fontWeight:700, color:online?P.green:"#e07a7a" }}>{online?"online":"waking up…"}</span>
            </div>
            {user ? (
              <>
                <button onClick={()=>setShowSaved(s=>!s)}
                  style={{ padding:"8px 16px", background:showSaved?`${P.purple}18`:"transparent", border:`1.5px solid ${showSaved?P.purple:P.border}`, borderRadius:10, color:showSaved?P.violet:P.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                  💾 saved
                </button>
                <span style={{ color:P.violet, fontSize:13, fontWeight:600 }}>👤 {user.username}</span>
                <button onClick={()=>{localStorage.removeItem("token");setUser(null);setSaved([])}}
                  style={{ padding:"8px 14px", background:"transparent", border:`1.5px solid ${P.border}`, borderRadius:10, color:P.muted, cursor:"pointer", fontSize:12 }}>
                  logout
                </button>
              </>
            ) : (
              <button onClick={()=>setShowAuth(true)}
                style={{ padding:"9px 18px", background:`${P.purple}14`, border:`1.5px solid ${P.purple}44`, borderRadius:12, color:P.violet, cursor:"pointer", fontSize:13, fontWeight:700 }}>
                login / sign up
              </button>
            )}
            <button onClick={()=>setShowTimer(t=>!t)}
              style={{ padding:"9px 18px", background:showTimer?`${P.purple}14`:"transparent", border:`1.5px solid ${showTimer?P.purple:P.border}`, borderRadius:12, color:showTimer?P.violet:P.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>
              ⏱ timer
            </button>
          </div>
        </div>

        {showTimer && <Timer />}

        {showSaved && user && (
          <div style={{ background:P.surface, border:`1.5px solid ${P.border}`, borderRadius:20, padding:24, marginBottom:24 }}>
            <p style={{ fontSize:16, fontWeight:700, marginBottom:16, color:P.text }}>💾 saved content</p>
            {savedItems.length===0 ? (
              <p style={{ color:P.muted, fontSize:14 }}>nothing saved yet</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {savedItems.map(item => (
                  <div key={item.id} style={{ padding:"12px 16px", background:P.raised, borderRadius:12, border:`1.5px solid ${P.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:P.violet, marginBottom:2 }}>{item.type}</p>
                      <p style={{ fontSize:12, color:P.muted }}>{item.title}</p>
                    </div>
                    <button onClick={()=>{setOutput(item.content);setType(item.type);setActiveTab(item.type);setShowSaved(false)}}
                      style={{ padding:"6px 14px", background:P.purple, border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                      view
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop}
          onClick={()=>!sessionId&&fileRef.current?.click()}
          style={{ background:P.surface, border:`1.5px ${dragOver?"solid":"dashed"} ${dragOver?P.violet+"88":sessionId?P.purple+"33":P.border}`, borderRadius:20, padding:"26px 28px", marginBottom:24, position:"relative", overflow:"hidden", cursor:!sessionId?"pointer":"default", transition:"all 0.25s", boxShadow:dragOver?`0 0 40px ${P.purple}18`:"none" }}>
          {sessionId && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${P.purple},${P.pink},${P.green},${P.amber},${P.blue})` }} />}
          <input ref={fileRef} type="file" accept={ACCEPT} onChange={onFileChange} style={{ display:"none" }} />
          {!sessionId ? (
            <div style={{ textAlign:"center", padding:"10px 0" }}>
              <div style={{ fontSize:44, marginBottom:12 }}>{dragOver?"📥":"📂"}</div>
              <p style={{ color:dragOver?P.violet:P.muted, fontSize:15, fontWeight:600, marginBottom:6 }}>
                {dragOver?"drop it!":"drag & drop or click to upload"}
              </p>
              <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginBottom:18 }}>
                {["PDF","DOCX","PPTX","Images","TXT","CSV"].map(f => (
                  <span key={f} style={{ padding:"4px 12px", background:P.raised, border:`1px solid ${P.border}`, borderRadius:20, fontSize:11, color:P.muted, fontWeight:600 }}>{f}</span>
                ))}
              </div>
              <label style={{ cursor:"pointer", background:`linear-gradient(135deg,${P.purple},${P.violet})`, padding:"11px 28px", borderRadius:12, fontSize:14, color:"#fff", fontWeight:700 }}>
                {uploading?"uploading…":"choose file"}
                <input type="file" accept={ACCEPT} onChange={onFileChange} style={{ display:"none" }} />
              </label>
            </div>
          ) : (
            <div>
              <p style={{ color:P.muted, fontSize:11, marginBottom:12, textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>loaded files</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                {sessions.map(s => (
                  <div key={s.id} onClick={()=>setSessionId(s.id)}
                    style={{ padding:"8px 16px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600, transition:"all 0.2s", background:sessionId===s.id?`${P.purple}18`:P.raised, border:`1.5px solid ${sessionId===s.id?P.purple+"66":P.border}`, color:sessionId===s.id?P.violet:P.muted }}>
                    {fileIcon(s.name)} {s.name}
                    {sessionId===s.id && <span style={{ marginLeft:8, fontSize:10, background:P.purple, color:"#fff", padding:"2px 7px", borderRadius:6 }}>active</span>}
                  </div>
                ))}
              </div>
              <label style={{ cursor:"pointer", color:P.violet, fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", background:`${P.purple}10`, border:`1px solid ${P.purple}33`, borderRadius:10 }}>
                + upload another
                <input type="file" accept={ACCEPT} onChange={onFileChange} style={{ display:"none" }} />
              </label>
            </div>
          )}
        </div>

        {sessionId && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
              <span style={{ color:P.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5 }}>count</span>
              {[5,10,15,20].map(n => (
                <button key={n} onClick={()=>setCount(n)}
                  style={{ padding:"5px 16px", borderRadius:8, border:`1.5px solid ${count===n?P.purple:P.border}`, background:count===n?`${P.purple}18`:"transparent", color:count===n?P.violet:P.muted, cursor:"pointer", fontSize:14, fontWeight:700, transition:"all 0.2s" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(152px,1fr))", gap:10 }}>
              {FEATURES.map(f => (
                <button key={f.id} onClick={()=>doAction(f.id)}
                  style={{ padding:"16px 12px", borderRadius:16, border:`1.5px solid ${activeTab===f.id?f.color+"66":P.border}`, cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.25s", background:activeTab===f.id?`${f.color}14`:P.surface, color:activeTab===f.id?f.color:P.muted, boxShadow:activeTab===f.id?`0 0 28px ${f.color}20`:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:26 }}>{f.icon}</span>
                  <span style={{ fontSize:12 }}>{f.label}</span>
                  <span style={{ fontSize:10, color:activeTab===f.id?f.color+"99":P.dim, fontWeight:500 }}>{f.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          <button onClick={()=>setActiveTab("chat")}
            style={{ padding:"9px 20px", borderRadius:10, border:`1.5px solid ${activeTab==="chat"?P.purple:P.border}`, fontSize:13, fontWeight:700, cursor:"pointer", background:activeTab==="chat"?`${P.purple}14`:P.surface, color:activeTab==="chat"?P.violet:P.muted }}>
            💬 chat
          </button>
          {output && (
            <button onClick={()=>setActiveTab(outputType)}
              style={{ padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", textTransform:"capitalize", border:`1.5px solid ${activeTab===outputType?(FEATURES.find(f=>f.id===outputType)?.color||P.pink):P.border}`, background:activeTab===outputType?`${FEATURES.find(f=>f.id===outputType)?.color||P.pink}14`:P.surface, color:activeTab===outputType?FEATURES.find(f=>f.id===outputType)?.color||P.rose:P.muted }}>
              {FEATURES.find(f=>f.id===outputType)?.icon||"📝"} {outputType.replace(/_/g," ")}
            </button>
          )}
        </div>

        {activeTab==="chat" && (
          <>
            <div style={{ background:P.surface, border:`1.5px solid ${P.border}`, borderRadius:20, padding:22, minHeight:320, marginBottom:14, overflowY:"auto", maxHeight:460 }}>
              {messages.length===0 && (
                <div style={{ textAlign:"center", paddingTop:90 }}>
                  <div style={{ fontSize:52, marginBottom:12 }}>🎓</div>
                  <p style={{ color:P.dim, fontSize:14 }}>upload a file to start chatting</p>
                  <p style={{ color:P.dim, fontSize:12, marginTop:6 }}>supports PDF, DOCX, PPTX, images & more</p>
                </div>
              )}
              {messages.map((m,i) => (
                <div key={i} style={{ marginBottom:14, display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"80%", padding:"13px 17px", fontSize:14, lineHeight:1.8, color:P.text, background:m.role==="user"?`linear-gradient(135deg,${P.purple},${P.violet})`:P.raised, borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px", border:m.role==="user"?"none":`1.5px solid ${P.border}`, whiteSpace:"pre-wrap" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:"flex", gap:5, padding:12, alignItems:"center" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:P.purple, animation:`bounce 1s ${i*0.18}s infinite` }} />)}
                  <span style={{ color:P.dim, fontSize:12, marginLeft:8 }}>thinking…</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()}
                placeholder={sessionId?"ask anything about your notes…":"upload a file first"} disabled={!sessionId}
                style={{ flex:1, padding:"14px 20px", background:P.surface, border:`1.5px solid ${P.border}`, borderRadius:14, color:P.text, fontSize:14, outline:"none" }}
                onFocus={e=>e.target.style.borderColor=P.purple+"88"} onBlur={e=>e.target.style.borderColor=P.border} />
              <button onClick={sendMessage} disabled={!sessionId||loading}
                style={{ padding:"14px 26px", background:`linear-gradient(135deg,${P.purple},${P.violet})`, border:"none", borderRadius:14, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700, opacity:!sessionId||loading?0.5:1 }}>
                send
              </button>
            </div>
          </>
        )}

        {activeTab!=="chat" && (
          <div style={{ background:P.surface, border:`1.5px solid ${P.border}`, borderRadius:20, padding:26 }}>
            {loading ? (
              <div style={{ textAlign:"center", padding:70 }}>
                <div style={{ display:"flex", gap:7, justifyContent:"center", marginBottom:20 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:12, height:12, borderRadius:"50%", background:`linear-gradient(135deg,${P.purple},${P.pink})`, animation:`bounce 1s ${i*0.18}s infinite` }} />)}
                </div>
                <p style={{ color:P.muted, fontSize:14, fontWeight:500 }}>generating {outputType.replace(/_/g," ")}…</p>
                <p style={{ color:P.dim, fontSize:12, marginTop:6 }}>this takes 10–30 seconds</p>
              </div>
            ) : (
              <>
                {renderInputPanel()}
                {renderOutput()}
              </>
            )}
          </div>
        )}

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        * { box-sizing:border-box; margin:0; padding:0; }
        input::placeholder,textarea::placeholder { color:#2a2a40; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1c1c30; border-radius:4px; }
        button:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); }
        button:active:not(:disabled) { transform:translateY(0); }
      `}</style>
    </div>
  )
}