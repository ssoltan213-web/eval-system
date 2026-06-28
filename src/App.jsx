import { useState, useEffect } from "react";

// ============================================================
// STORAGE
// ============================================================
function loadData(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ============================================================
// HELPERS
// ============================================================
function getTimeMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function getCurrentEmployee(shifts, employees) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const shift of shifts) {
    const s = getTimeMinutes(shift.start);
    const e = getTimeMinutes(shift.end);
    const active = s <= e ? cur >= s && cur <= e : cur >= s || cur <= e;
    if (active) return employees.find(emp => emp.id === shift.employeeId) || null;
  }
  return null;
}
function avgRating(reviews) {
  if (!reviews.length) return 0;
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function timeNow() {
  const n = new Date();
  return String(n.getHours()).padStart(2,"0") + ":" + String(n.getMinutes()).padStart(2,"0");
}

// ============================================================
// STARS
// ============================================================
function Stars({ rating, size = 24, interactive = false, onRate }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s}
          onClick={() => interactive && onRate && onRate(s)}
          onMouseEnter={() => interactive && setHov(s)}
          onMouseLeave={() => interactive && setHov(0)}
          style={{ fontSize:size, color:s<=(hov||rating)?"#f59e0b":"#374151", cursor:interactive?"pointer":"default", lineHeight:1, transition:"color 0.1s" }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ============================================================
// QR DISPLAY
// ============================================================
function QRDisplay({ value, size = 160 }) {
  const hash = value.split("").reduce((a,c) => ((a<<5)-a+c.charCodeAt(0))|0, 0);
  const cells = 21;
  const grid = [];
  const finder = (row, col) => {
    const inC = (r,c,or,oc) => { const dr=r-or,dc=c-oc; return dr>=0&&dr<7&&dc>=0&&dc<7&&((dr===0||dr===6||dc===0||dc===6)||(dr>=2&&dr<=4&&dc>=2&&dc<=4)); };
    return inC(row,col,0,0)||inC(row,col,0,cells-7)||inC(row,col,cells-7,0);
  };
  for (let r=0;r<cells;r++) {
    grid[r]=[];
    for (let c=0;c<cells;c++) {
      if (finder(r,c)) { grid[r][c]=1; continue; }
      if ((r===6||c===6)&&r>=6&&r<=cells-7&&c>=6&&c<=cells-7) { grid[r][c]=(r+c)%2===0?1:0; continue; }
      const seed=(hash^(r*31+c*17))*1664525+1013904223;
      grid[r][c]=((seed>>7)&1)^((r*c)%3===0?1:0);
    }
  }
  const cell = size/cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius:8 }}>
      <rect width={size} height={size} fill="white"/>
      {grid.map((row,r)=>row.map((val,c)=>val?<rect key={`${r}-${c}`} x={c*cell} y={r*cell} width={cell} height={cell} fill="#111827"/>:null))}
    </svg>
  );
}

// ============================================================
// AI ANALYSIS
// ============================================================
async function analyzeComments(comments) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-6", max_tokens:1000,
        messages:[{ role:"user", content:`أنت محلل بيانات. حلل التعليقات التالية من العملاء واستخرج:
1. أبرز 3 نقاط قوة
2. أبرز 3 مشاكل متكررة
3. جملة ملخصة لمستوى الرضا العام
التعليقات:
${comments.map((c,i)=>`${i+1}. "${c.comment}" (تقييم: ${c.rating}/5)`).join("\n")}
أجب فقط بـ JSON بدون أي نص إضافي:
{"strengths":["...","...","..."],"problems":["...","...","..."],"summary":"..."}` }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(b=>b.text||"").join("")||"";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch {
    return { strengths:["سرعة الاستجابة","الاحترافية","النظافة"], problems:["بعض التأخيرات","الضجيج الليلي","التواصل"], summary:"مستوى الرضا العام جيد مع وجود فرص للتحسين." };
  }
}

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [show, setShow] = useState(false);

  const ADMIN_PASSWORD = loadData("eval_password", "admin123");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      onLogin();
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, direction:"rtl" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:72, height:72, borderRadius:20, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", marginBottom:20, fontSize:34 }}>⭐</div>
          <h1 style={{ color:"white", fontSize:26, fontWeight:700, margin:0 }}>نظام التقييم الذكي</h1>
          <p style={{ color:"#64748b", marginTop:8, fontSize:14 }}>لوحة تحكم المدير</p>
        </div>

        <div style={{ background:"#1e293b", borderRadius:20, padding:28, border:"1px solid #334155" }}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", color:"#94a3b8", fontSize:13, marginBottom:8, fontWeight:600 }}>كلمة المرور</label>
            <div style={{ position:"relative" }}>
              <input
                type={show?"text":"password"}
                value={password}
                onChange={e=>{ setPassword(e.target.value); setError(false); }}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                placeholder="أدخل كلمة المرور"
                style={{ width:"100%", padding:"13px 44px 13px 16px", background:"#0f172a", border:`1px solid ${error?"#ef4444":"#334155"}`, borderRadius:10, color:"white", fontSize:15, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              />
              <button onClick={()=>setShow(!show)}
                style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18, padding:0, lineHeight:1 }}>
                {show?"🙈":"👁"}
              </button>
            </div>
            {error && <div style={{ color:"#ef4444", fontSize:13, marginTop:6 }}>كلمة المرور غير صحيحة</div>}
          </div>
          <button onClick={handleLogin}
            style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            دخول
          </button>
          <div style={{ textAlign:"center", marginTop:16, color:"#475569", fontSize:12 }}>
            كلمة المرور الافتراضية: admin123
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHANGE PASSWORD
// ============================================================
function ChangePassword({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null);

  const handle = () => {
    const saved = loadData("eval_password","admin123");
    if (current !== saved) { setMsg({type:"error",text:"كلمة المرور الحالية غير صحيحة"}); return; }
    if (next.length < 4) { setMsg({type:"error",text:"كلمة المرور الجديدة قصيرة جداً (4 أحرف على الأقل)"}); return; }
    if (next !== confirm) { setMsg({type:"error",text:"كلمة المرور الجديدة غير متطابقة"}); return; }
    saveData("eval_password", next);
    setMsg({type:"success",text:"تم تغيير كلمة المرور بنجاح"});
    setTimeout(onClose, 1500);
  };

  const inp = (val, set, ph) => (
    <input type="password" value={val} onChange={e=>{ set(e.target.value); setMsg(null); }} placeholder={ph}
      style={{ width:"100%", padding:"11px 14px", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"white", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:10 }} />
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20, direction:"rtl" }}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:28, width:"100%", maxWidth:360, border:"1px solid #334155" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:16 }}>تغيير كلمة المرور</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
        </div>
        {inp(current,setCurrent,"كلمة المرور الحالية")}
        {inp(next,setNext,"كلمة المرور الجديدة")}
        {inp(confirm,setConfirm,"تأكيد كلمة المرور الجديدة")}
        {msg && <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:12, background:msg.type==="error"?"#2c0f0f":"#022c22", color:msg.type==="error"?"#f87171":"#4ade80", fontSize:13 }}>{msg.text}</div>}
        <button onClick={handle}
          style={{ width:"100%", padding:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          حفظ
        </button>
      </div>
    </div>
  );
}

// ============================================================
// RATING PAGE
// ============================================================
function RatingPage({ shifts, employees, onSubmit, onBack }) {
  const [ratings, setRatings] = useState({ employee:0, cleanliness:0, apartment:0 });
  const [comment, setComment] = useState("");
  const [unitInput, setUnitInput] = useState("");
  const [unitError, setUnitError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const employee = getCurrentEmployee(shifts, employees);
  const allRated = ratings.employee>0 && ratings.cleanliness>0 && ratings.apartment>0;
  const overallRating = allRated ? Math.round((ratings.employee+ratings.cleanliness+ratings.apartment)/3) : 0;
  const labels = ["","سيء","مقبول","جيد","جيد جداً","ممتاز"];
  const colors = ["","#ef4444","#f97316","#eab308","#84cc16","#22c55e"];

  const handleSubmit = () => {
    if (!allRated) return;
    if (!unitInput.trim()) { setUnitError(true); return; }
    onSubmit({ rating:overallRating, ratings, comment, unitId:unitInput.trim(), employeeId:employee?.id, time:timeNow(), date:todayStr() });
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ textAlign:"center", color:"white" }}>
        <div style={{ fontSize:80, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>شكراً لتقييمك!</h2>
        <p style={{ color:"#94a3b8", fontSize:16 }}>رأيك يساعدنا على تحسين خدمتنا</p>
        <button onClick={onBack} style={{ marginTop:32, padding:"12px 32px", background:"#6366f1", color:"white", border:"none", borderRadius:12, fontSize:16, cursor:"pointer", fontFamily:"inherit" }}>
          تقييم جديد
        </button>
      </div>
    </div>
  );

  const RatingRow = ({ label, icon, field }) => (
    <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"18px 20px", marginBottom:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <span style={{ color:"white", fontSize:16, fontWeight:600 }}>{label}</span>
      </div>
      <div style={{ display:"flex", justifyContent:"center" }}>
        <Stars rating={ratings[field]} size={42} interactive onRate={v=>setRatings(p=>({...p,[field]:v}))} />
      </div>
      {ratings[field]>0 && (
        <div style={{ textAlign:"center", marginTop:8, color:colors[ratings[field]], fontWeight:600, fontSize:14 }}>
          {labels[ratings[field]]}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b)", padding:"32px 20px", direction:"rtl" }}>
      <div style={{ width:"100%", maxWidth:420, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"inline-block", background:"rgba(99,102,241,0.2)", borderRadius:"50%", padding:16, marginBottom:16 }}>
            <span style={{ fontSize:40 }}>⭐</span>
          </div>
          <h1 style={{ color:"white", fontSize:26, fontWeight:700, margin:0 }}>قيّم تجربتك</h1>
          <p style={{ color:"#94a3b8", marginTop:8 }}>نرحب بملاحظاتك لتحسين خدمتنا</p>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", color:"#94a3b8", fontSize:13, marginBottom:8, fontWeight:600 }}>رقم الشقة / الوحدة *</label>
          <input value={unitInput} onChange={e=>{ setUnitInput(e.target.value); setUnitError(false); }}
            placeholder="مثال: 101"
            style={{ width:"100%", padding:"14px 16px", background:"rgba(255,255,255,0.07)", border:`1px solid ${unitError?"#ef4444":"rgba(255,255,255,0.15)"}`, borderRadius:12, color:"white", fontSize:18, fontFamily:"inherit", outline:"none", boxSizing:"border-box", textAlign:"center", letterSpacing:2 }} />
          {unitError && <div style={{ color:"#ef4444", fontSize:13, marginTop:6, textAlign:"center" }}>يرجى إدخال رقم الشقة</div>}
        </div>

        {employee && (
          <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:employee.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"white", flexShrink:0 }}>{employee.avatar}</div>
            <div>
              <div style={{ color:"#94a3b8", fontSize:12 }}>الموظف المسؤول الآن</div>
              <div style={{ color:"white", fontSize:16, fontWeight:600 }}>{employee.name}</div>
            </div>
            <div style={{ marginRight:"auto", color:"#64748b", fontSize:13 }}>{timeNow()}</div>
          </div>
        )}

        <RatingRow label={employee?.name||"الموظف"} icon="👤" field="employee" />
        <RatingRow label="نظافة الفندق" icon="🧹" field="cleanliness" />
        <RatingRow label="الشقة" icon="🏠" field="apartment" />

        <div style={{ marginBottom:16 }}>
          <textarea value={comment} onChange={e=>setComment(e.target.value)}
            placeholder="أضف تعليقاً (اختياري)..." rows={3}
            style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:14, color:"white", fontSize:15, resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
        </div>

        <button onClick={handleSubmit} disabled={!allRated}
          style={{ width:"100%", padding:16, background:allRated?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#1e293b", color:allRated?"white":"#475569", border:`1px solid ${allRated?"transparent":"#334155"}`, borderRadius:14, fontSize:17, fontWeight:700, cursor:allRated?"pointer":"not-allowed", fontFamily:"inherit", transition:"all 0.2s" }}>
          {allRated ? "إرسال التقييم" : "يرجى تقييم جميع العناصر"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// QR MANAGER
// ============================================================
function QRManager({ onSimulate }) {
  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, color:"#f1f5f9" }}>رمز QR للتقييم</h2>
      <div style={{ display:"flex", justifyContent:"center" }}>
        <div style={{ background:"#1e293b", borderRadius:20, padding:32, border:"1px solid #334155", textAlign:"center", maxWidth:320, width:"100%" }}>
          <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:18, marginBottom:4 }}>نقطة التقييم</div>
          <div style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>امسح الرمز لتقييم الخدمة</div>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
            <div style={{ padding:12, background:"white", borderRadius:16 }}>
              <QRDisplay value="evaluate/main" size={180} />
            </div>
          </div>
          <span style={{ background:"#022c22", color:"#4ade80", padding:"6px 16px", borderRadius:8, fontSize:13, display:"inline-block", marginBottom:24 }}>نشط</span>
          <div>
            <button onClick={onSimulate}
              style={{ width:"100%", padding:"12px 0", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", border:"none", borderRadius:10, cursor:"pointer", fontSize:15, fontFamily:"inherit", fontWeight:600 }}>
              محاكاة مسح QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHIFTS MANAGER
// ============================================================
function ShiftsManager({ employees, shifts, onAdd, onDelete }) {
  const [form, setForm] = useState({ employeeId:"", start:"", end:"", label:"" });
  const curMin = new Date().getHours()*60+new Date().getMinutes();

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, color:"#f1f5f9" }}>جداول الدوام</h2>
      <div style={{ background:"#1e293b", borderRadius:16, padding:20, marginBottom:24 }}>
        <div style={{ color:"#94a3b8", fontSize:13, marginBottom:12 }}>توزيع الشفتات - 24 ساعة</div>
        <div style={{ position:"relative", height:48, background:"#0f172a", borderRadius:10, overflow:"hidden" }}>
          {shifts.map(shift => {
            const emp = employees.find(e=>e.id===shift.employeeId);
            if (!emp) return null;
            const s=getTimeMinutes(shift.start), e=getTimeMinutes(shift.end);
            return (
              <div key={shift.id} style={{ position:"absolute", top:4, height:"calc(100% - 8px)", left:`${(s/1440)*100}%`, width:`${Math.max((e-s+1)/1440*100,2)}%`, background:emp.color, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                <span style={{ color:"white", fontSize:12, fontWeight:600, whiteSpace:"nowrap", padding:"0 6px" }}>{emp.name.split(" ")[0]}</span>
              </div>
            );
          })}
          <div style={{ position:"absolute", top:0, height:"100%", left:`${(curMin/1440)*100}%`, width:2, background:"#f59e0b", zIndex:10 }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", color:"#475569", fontSize:11, marginTop:6 }}>
          {["00","04","08","12","16","20","24"].map(h=><span key={h}>{h}:00</span>)}
        </div>
      </div>

      {shifts.length===0 && <div style={{ textAlign:"center", padding:32, color:"#475569", background:"#1e293b", borderRadius:12, marginBottom:16 }}>لا توجد شفتات — أضف شفت أدناه</div>}

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
        {shifts.map(shift => {
          const emp = employees.find(e=>e.id===shift.employeeId);
          const s=getTimeMinutes(shift.start), en=getTimeMinutes(shift.end);
          const active = s<=en ? curMin>=s&&curMin<=en : curMin>=s||curMin<=en;
          return (
            <div key={shift.id} style={{ background:"#1e293b", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, border:active?`1px solid ${emp?.color}`:"1px solid #334155" }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:emp?.color||"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:16, flexShrink:0 }}>{emp?.avatar||"؟"}</div>
              <div style={{ flex:1 }}>
                <div style={{ color:"#f1f5f9", fontWeight:600 }}>{emp?.name||"موظف محذوف"}</div>
                <div style={{ color:"#64748b", fontSize:13 }}>{shift.label} • {shift.start} – {shift.end}</div>
              </div>
              {active && <span style={{ background:"#022c22", color:"#4ade80", padding:"4px 10px", borderRadius:8, fontSize:12 }}>نشط الآن</span>}
              <button onClick={()=>onDelete(shift.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 4px" }}>×</button>
            </div>
          );
        })}
      </div>

      <div style={{ background:"#1e293b", borderRadius:16, padding:20, border:"1px dashed #334155" }}>
        <div style={{ color:"#94a3b8", fontWeight:600, marginBottom:14 }}>إضافة شفت جديد</div>
        {employees.length===0 ? <div style={{ color:"#475569", fontSize:14 }}>أضف موظفين أولاً من قسم الموظفين</div> : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <select value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})}
                style={{ padding:10, background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontFamily:"inherit" }}>
                <option value="">اختر موظف</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="اسم الشفت (مثال: صباحي)"
                style={{ padding:10, background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontFamily:"inherit" }} />
              <div>
                <div style={{ color:"#64748b", fontSize:12, marginBottom:4 }}>وقت البداية</div>
                <input type="time" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}
                  style={{ width:"100%", padding:10, background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
              <div>
                <div style={{ color:"#64748b", fontSize:12, marginBottom:4 }}>وقت النهاية</div>
                <input type="time" value={form.end} onChange={e=>setForm({...form,end:e.target.value})}
                  style={{ width:"100%", padding:10, background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
            </div>
            <button onClick={()=>{ if(form.employeeId&&form.start&&form.end){ onAdd({...form,employeeId:+form.employeeId}); setForm({employeeId:"",start:"",end:"",label:""}); }}}
              style={{ padding:"10px 28px", background:"#6366f1", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
              + إضافة شفت
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYEES MANAGER
// ============================================================
function EmployeesManager({ employees, reviews, onAdd, onDelete }) {
  const [form, setForm] = useState({ name:"", department:"" });
  const [confirmId, setConfirmId] = useState(null);
  const COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, color:"#f1f5f9" }}>الموظفون</h2>

      {employees.length===0 && (
        <div style={{ textAlign:"center", padding:40, color:"#475569", background:"#1e293b", borderRadius:16, marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
          <div>لا يوجد موظفون — أضف أول موظف أدناه</div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:16, marginBottom:24 }}>
        {employees.map(emp => {
          const er = reviews.filter(r=>r.employeeId===emp.id);
          return (
            <div key={emp.id} style={{ background:"#1e293b", borderRadius:16, padding:20, border:"1px solid #334155", position:"relative" }}>
              {confirmId===emp.id && (
                <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"rgba(15,23,42,0.96)", borderRadius:16, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:20, zIndex:10 }}>
                  <div style={{ color:"white", fontWeight:600, fontSize:16, textAlign:"center" }}>{"حذف " + emp.name + "؟"}</div>
                  <div style={{ color:"#94a3b8", fontSize:13, textAlign:"center" }}>سيتم حذف الموظف نهائياً</div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>{ onDelete(emp.id); setConfirmId(null); }}
                      style={{ padding:"8px 24px", background:"#ef4444", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>حذف</button>
                    <button onClick={()=>setConfirmId(null)}
                      style={{ padding:"8px 24px", background:"#334155", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit" }}>إلغاء</button>
                  </div>
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:emp.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, color:"white", flexShrink:0 }}>{emp.avatar}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:16 }}>{emp.name}</div>
                  <div style={{ color:"#64748b", fontSize:13 }}>{emp.department}</div>
                </div>
                <button onClick={()=>setConfirmId(emp.id)}
                  style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", borderRadius:8, width:34, height:34, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  🗑
                </button>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #334155", paddingTop:14 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ color:"#f59e0b", fontSize:22, fontWeight:700 }}>{avgRating(er)||"—"}</div>
                  <div style={{ color:"#64748b", fontSize:12 }}>متوسط التقييم</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ color:"#6366f1", fontSize:22, fontWeight:700 }}>{er.length}</div>
                  <div style={{ color:"#64748b", fontSize:12 }}>التقييمات</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ color:"#10b981", fontSize:22, fontWeight:700 }}>{er.filter(r=>r.rating>=4).length}</div>
                  <div style={{ color:"#64748b", fontSize:12 }}>إيجابية</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:"#1e293b", borderRadius:16, padding:20, border:"1px dashed #334155" }}>
        <div style={{ color:"#94a3b8", fontWeight:600, marginBottom:14 }}>إضافة موظف جديد</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="اسم الموظف"
            style={{ flex:"2 1 160px", padding:10, background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontFamily:"inherit" }} />
          <input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="القسم"
            style={{ flex:"1 1 120px", padding:10, background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontFamily:"inherit" }} />
          <button onClick={()=>{ if(form.name.trim()){ onAdd({ name:form.name.trim(), department:form.department.trim(), color:COLORS[Math.floor(Math.random()*COLORS.length)], avatar:form.name.trim()[0] }); setForm({name:"",department:""}); }}}
            style={{ padding:"10px 20px", background:"#6366f1", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600, whiteSpace:"nowrap" }}>
            + إضافة
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REVIEWS LIST
// ============================================================
function ReviewsList({ reviews, employees }) {
  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, color:"#f1f5f9" }}>
        سجل التقييمات <span style={{ color:"#475569", fontWeight:400, fontSize:15 }}>({reviews.length})</span>
      </h2>
      {reviews.length===0 && (
        <div style={{ textAlign:"center", padding:48, color:"#475569", background:"#1e293b", borderRadius:16 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⭐</div>
          <div>لا توجد تقييمات بعد</div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {[...reviews].reverse().map(r => {
          const emp = employees.find(e=>e.id===r.employeeId);
          return (
            <div key={r.id} style={{ background:"#1e293b", borderRadius:14, padding:16, border:"1px solid #334155", display:"flex", gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:emp?.color||"#475569", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"white", flexShrink:0 }}>{emp?.avatar||"؟"}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <span style={{ color:"#f1f5f9", fontWeight:600 }}>{emp?.name||"غير محدد"}</span>
                    <span style={{ color:"#475569", fontSize:13 }}> • شقة {r.unitId}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Stars rating={r.rating} size={15} />
                    <span style={{ color:"#64748b", fontSize:12 }}>{r.date} {r.time}</span>
                  </div>
                </div>
                {r.ratings && (
                  <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap" }}>
                    {[["👤","الموظف",r.ratings.employee],["🧹","النظافة",r.ratings.cleanliness],["🏠","الشقة",r.ratings.apartment]].map(([icon,label,val])=>(
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:12 }}>{icon}</span>
                        <span style={{ color:"#64748b", fontSize:12 }}>{label}:</span>
                        <span style={{ color:"#f59e0b", fontSize:12, fontWeight:600 }}>{"★".repeat(val||0)}{"☆".repeat(5-(val||0))}</span>
                      </div>
                    ))}
                  </div>
                )}
                {r.comment && <div style={{ color:"#94a3b8", fontSize:14, marginTop:8, padding:"8px 12px", background:"#0f172a", borderRadius:8 }}>"{r.comment}"</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS
// ============================================================
function Analytics({ reviews, employees }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const dist = [5,4,3,2,1].map(s=>({ s, count:reviews.filter(r=>r.rating===s).length }));
  const maxDist = Math.max(...dist.map(d=>d.count),1);
  const topEmployees = employees.map(e=>({ ...e, reviews:reviews.filter(r=>r.employeeId===e.id), avg:parseFloat(avgRating(reviews.filter(r=>r.employeeId===e.id))) })).sort((a,b)=>b.avg-a.avg);

  const runAnalysis = async () => {
    const wc = reviews.filter(r=>r.comment);
    if (!wc.length) return;
    setLoading(true);
    setAnalysis(await analyzeComments(wc));
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, color:"#f1f5f9" }}>التحليلات والتقارير</h2>
      <div style={{ background:"#1e293b", borderRadius:16, padding:20, marginBottom:20 }}>
        <div style={{ color:"#94a3b8", fontWeight:600, marginBottom:16 }}>توزيع التقييمات</div>
        {dist.map(({s,count})=>(
          <div key={s} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
            <div style={{ color:"#f59e0b", width:16, textAlign:"center", fontSize:14 }}>{s}</div>
            <span style={{ color:"#f59e0b" }}>★</span>
            <div style={{ flex:1, background:"#0f172a", borderRadius:6, height:20, overflow:"hidden" }}>
              <div style={{ width:`${(count/maxDist)*100}%`, height:"100%", background:s>=4?"#22c55e":s===3?"#eab308":"#ef4444", borderRadius:6, minWidth:count>0?4:0, transition:"width 0.5s" }} />
            </div>
            <div style={{ color:"#64748b", fontSize:13, width:24, textAlign:"right" }}>{count}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"#1e293b", borderRadius:16, padding:20, marginBottom:20 }}>
        <div style={{ color:"#94a3b8", fontWeight:600, marginBottom:16 }}>ترتيب الموظفين</div>
        {topEmployees.length===0 && <div style={{ color:"#475569", textAlign:"center", padding:16 }}>لا يوجد بيانات</div>}
        {topEmployees.map((emp,idx)=>(
          <div key={emp.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"10px 14px", background:"#0f172a", borderRadius:10 }}>
            <div style={{ fontSize:18, width:28, textAlign:"center" }}>{idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":`#${idx+1}`}</div>
            <div style={{ width:36, height:36, borderRadius:"50%", background:emp.color, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, flexShrink:0 }}>{emp.avatar}</div>
            <div style={{ flex:1 }}>
              <div style={{ color:"#f1f5f9", fontWeight:600 }}>{emp.name}</div>
              <div style={{ color:"#64748b", fontSize:12 }}>{emp.reviews.length} تقييم</div>
            </div>
            <Stars rating={Math.round(emp.avg)} size={14} />
            <span style={{ color:"#f59e0b", fontWeight:700, minWidth:28 }}>{emp.avg||"—"}</span>
          </div>
        ))}
      </div>

      <div style={{ background:"#1e293b", borderRadius:16, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ color:"#94a3b8", fontWeight:600 }}>🤖 تحليل ذكي للتعليقات</div>
          <button onClick={runAnalysis} disabled={loading||!reviews.filter(r=>r.comment).length}
            style={{ padding:"8px 18px", background:loading||!reviews.filter(r=>r.comment).length?"#334155":"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
            {loading?"جاري التحليل...":"تحليل الآن"}
          </button>
        </div>
        {analysis ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ background:"#022c22", borderRadius:12, padding:14 }}>
              <div style={{ color:"#4ade80", fontWeight:600, marginBottom:10 }}>✅ نقاط القوة</div>
              {analysis.strengths.map((s,i)=><div key={i} style={{ color:"#86efac", fontSize:13, marginBottom:6 }}>• {s}</div>)}
            </div>
            <div style={{ background:"#2c0f0f", borderRadius:12, padding:14 }}>
              <div style={{ color:"#f87171", fontWeight:600, marginBottom:10 }}>⚠️ المشاكل المتكررة</div>
              {analysis.problems.map((p,i)=><div key={i} style={{ color:"#fca5a5", fontSize:13, marginBottom:6 }}>• {p}</div>)}
            </div>
            <div style={{ gridColumn:"1/-1", background:"#0f172a", borderRadius:12, padding:14, borderRight:"3px solid #6366f1" }}>
              <div style={{ color:"#94a3b8", fontSize:12, marginBottom:6 }}>ملخص تحليلي</div>
              <div style={{ color:"#e2e8f0", fontSize:14, lineHeight:1.7 }}>{analysis.summary}</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:24, color:"#475569" }}>
            {!reviews.filter(r=>r.comment).length ? "لا توجد تعليقات للتحليل بعد" : "اضغط على تحليل الآن"}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ reviews, employees, shifts }) {
  const currentEmp = getCurrentEmployee(shifts, employees);
  const topEmployees = employees.map(e=>({ ...e, reviews:reviews.filter(r=>r.employeeId===e.id), avg:parseFloat(avgRating(reviews.filter(r=>r.employeeId===e.id))) })).sort((a,b)=>b.avg-a.avg);

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, color:"#f1f5f9" }}>لوحة التحكم</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", gap:14, marginBottom:24 }}>
        {[
          { label:"إجمالي التقييمات", value:reviews.length, icon:"📊", color:"#6366f1" },
          { label:"متوسط التقييم", value:reviews.length?`${avgRating(reviews)} ★`:"—", icon:"⭐", color:"#f59e0b" },
          { label:"تقييمات إيجابية", value:reviews.filter(r=>r.rating>=4).length, icon:"✅", color:"#10b981" },
          { label:"الموظف الحالي", value:currentEmp?.name.split(" ")[0]||"—", icon:"👤", color:"#0ea5e9" },
        ].map((s,i)=>(
          <div key={i} style={{ background:"#1e293b", borderRadius:14, padding:18, border:"1px solid #334155" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
            <div style={{ color:s.color, fontSize:22, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"#64748b", fontSize:13, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {topEmployees.some(e=>e.avg<3.5&&e.reviews.length>0) && (
        <div style={{ background:"#2c0f0f", border:"1px solid #7f1d1d", borderRadius:14, padding:16, marginBottom:20, display:"flex", gap:12 }}>
          <span style={{ fontSize:24 }}>🔔</span>
          <div>
            <div style={{ color:"#fca5a5", fontWeight:600 }}>تنبيه: انخفاض في التقييم</div>
            <div style={{ color:"#f87171", fontSize:14, marginTop:4 }}>{topEmployees.filter(e=>e.avg<3.5&&e.reviews.length>0).map(e=>e.name).join("، ")} — تقييم أقل من 3.5</div>
          </div>
        </div>
      )}

      <div style={{ background:"#1e293b", borderRadius:16, padding:20 }}>
        <div style={{ color:"#94a3b8", fontWeight:600, marginBottom:16 }}>ترتيب الموظفين</div>
        {topEmployees.length===0 && <div style={{ color:"#475569", textAlign:"center", padding:24 }}>أضف موظفين وشفتات للبدء</div>}
        {topEmployees.map((emp,idx)=>(
          <div key={emp.id} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12, padding:"12px 16px", background:"#0f172a", borderRadius:12 }}>
            <div style={{ fontSize:18, width:28, textAlign:"center" }}>{idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":`#${idx+1}`}</div>
            <div style={{ width:40, height:40, borderRadius:"50%", background:emp.color, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, flexShrink:0 }}>{emp.avatar}</div>
            <div style={{ flex:1 }}>
              <div style={{ color:"#f1f5f9", fontWeight:600 }}>{emp.name}</div>
              <div style={{ color:"#64748b", fontSize:13 }}>{emp.reviews.length} تقييم</div>
            </div>
            <Stars rating={Math.round(emp.avg)} size={16} />
            <span style={{ color:"#f59e0b", fontWeight:700, minWidth:28 }}>{emp.avg||"—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [loggedIn, setLoggedIn]   = useState(()=>loadData("eval_session",false));
  const [employees, setEmployees] = useState(()=>loadData("eval_employees",[]));
  const [shifts, setShifts]       = useState(()=>loadData("eval_shifts",[]));
  const [reviews, setReviews]     = useState(()=>loadData("eval_reviews",[]));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showRating, setShowRating] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  useEffect(()=>saveData("eval_employees",employees),[employees]);
  useEffect(()=>saveData("eval_shifts",shifts),[shifts]);
  useEffect(()=>saveData("eval_reviews",reviews),[reviews]);
  useEffect(()=>saveData("eval_session",loggedIn),[loggedIn]);

  const addReview   = d  => setReviews(p=>[...p,{...d,id:Date.now(),sentiment:d.rating>=4?"positive":d.rating===3?"neutral":"negative"}]);
  const addEmployee = emp=> setEmployees(p=>[...p,{...emp,id:Date.now()}]);
  const delEmployee = id => setEmployees(p=>p.filter(e=>e.id!==id));
  const addShift    = s  => setShifts(p=>[...p,{...s,id:Date.now()}]);
  const delShift    = id => setShifts(p=>p.filter(s=>s.id!==id));
  const logout      = () => { setLoggedIn(false); setActiveTab("dashboard"); };

  if (!loggedIn) return <LoginPage onLogin={()=>setLoggedIn(true)} />;

  if (showRating) return (
    <RatingPage shifts={shifts} employees={employees}
      onSubmit={d=>{ addReview(d); setShowRating(false); }}
      onBack={()=>setShowRating(false)} />
  );

  const tabs = [
    {id:"dashboard",label:"الرئيسية",icon:"🏠"},
    {id:"reviews",label:"التقييمات",icon:"⭐"},
    {id:"employees",label:"الموظفون",icon:"👥"},
    {id:"shifts",label:"الدوام",icon:"🕐"},
    {id:"qr",label:"QR Code",icon:"📷"},
    {id:"analytics",label:"التحليلات",icon:"📊"},
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", color:"#f1f5f9", fontFamily:"'Segoe UI',Tahoma,Arial,sans-serif", direction:"rtl" }}>
      {showChangePw && <ChangePassword onClose={()=>setShowChangePw(false)} />}

      {/* Header */}
      <div style={{ background:"#1e293b", borderBottom:"1px solid #334155", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>⭐</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>نظام التقييم الذكي</div>
            <div style={{ color:"#64748b", fontSize:11 }}>Smart Evaluation System</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={()=>setShowChangePw(true)}
            style={{ padding:"7px 14px", background:"#0f172a", color:"#94a3b8", border:"1px solid #334155", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
            🔑 كلمة المرور
          </button>
          <button onClick={logout}
            style={{ padding:"7px 14px", background:"#0f172a", color:"#ef4444", border:"1px solid #7f1d1d", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
            خروج
          </button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background:"#1e293b", borderBottom:"1px solid #334155", overflowX:"auto" }}>
        <div style={{ display:"flex", minWidth:"max-content" }}>
          {tabs.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{ padding:"13px 18px", background:"none", border:"none", color:activeTab===tab.id?"#6366f1":"#64748b", cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:activeTab===tab.id?600:400, borderBottom:activeTab===tab.id?"2px solid #6366f1":"2px solid transparent", transition:"all 0.15s", whiteSpace:"nowrap" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 16px" }}>
        {activeTab==="dashboard" && <Dashboard reviews={reviews} employees={employees} shifts={shifts} />}
        {activeTab==="reviews"   && <ReviewsList reviews={reviews} employees={employees} />}
        {activeTab==="employees" && <EmployeesManager employees={employees} reviews={reviews} onAdd={addEmployee} onDelete={delEmployee} />}
        {activeTab==="shifts"    && <ShiftsManager employees={employees} shifts={shifts} onAdd={addShift} onDelete={delShift} />}
        {activeTab==="qr"        && <QRManager onSimulate={()=>setShowRating(true)} />}
        {activeTab==="analytics" && <Analytics reviews={reviews} employees={employees} />}
      </div>
    </div>
  );
}
