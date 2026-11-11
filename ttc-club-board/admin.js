"use strict";
// דף הניהול של הפורטל. ההסתרה כאן היא רק נוחות: כל קריאה וכתיבה נאכפת בחוקי Firestore
// (isBoardOwner במערכת הנוכחות) — מי שאינו הבעלים נדחה בשרת גם אם יעקוף את הקוד הזה.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const OWNER_HASH = "01729b4d5d3e455f8bacc0637897aa134b9fb122fc148113f0d0180dfab464f4";
const EVENTS = { "crane-2026": "מרוץ העגור" }; // אירוע חדש עם הרשמה דורש גם עדכון בחוקי Firestore
const SIGNUP_SHEET = "https://docs.google.com/spreadsheets/d/1XhLZJG509VqFXOkqebFKU0CyVW3BHx8nrskc6rr3YhA/edit";
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const fmtDate = (v) => { const t = v && (typeof v.toDate === "function" ? v.toDate() : new Date(v)); return t && !isNaN(t) ? t.toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : ""; };
const GICON = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

let USER = null, TAB = "posts", A = null, ROLE = "owner", ASKED = false;
const main = $("#main");
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }
async function isOwner(email) {
  try { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode((email || "").trim().toLowerCase())); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("") === OWNER_HASH; } catch (e) { return false; }
}
const denied = (e) => e && (e.code === "permission-denied" || /permission/i.test(e.message || ""));
async function run(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
  catch (e) { toast(denied(e) ? "אין הרשאה לפעולה הזו" : "הפעולה לא הצליחה. בדקו את החיבור ונסו שוב."); throw e; }
}

/* ---------- entry: sign in → owner check → tabs ---------- */
function signedOut() {
  $("#tabbar").hidden = true;
  main.innerHTML = `<div class="center screen"><img src="logo.png" alt=""><h2>כניסה לניהול</h2><div class="muted">רק לבעל המועדון</div><button class="gbtn" id="in" type="button">${GICON}כניסה עם Google</button></div>`;
  $("#in").onclick = async () => { ASKED = true; try { await TTCAuth.signIn(); } catch (e) { if (e && e.code === "auth/popup-blocked") toast("הדפדפן חסם את חלון הכניסה. לחצו שוב"); } };
}
function notOwner() {
  try { localStorage.removeItem("ttc_admin"); } catch (e) {}
  $("#tabbar").hidden = true;
  main.innerHTML = `<div class="center screen"><img src="logo.png" alt=""><h2>הדף הזה פרטי</h2><div class="muted">אין לחשבון הזה גישה לניהול.</div><div class="row" style="justify-content:center"><a class="btn ghost" href="./" style="display:inline-flex;align-items:center;text-decoration:none">לפורטל</a><button class="btn ghost" id="out" type="button">התנתקות</button></div></div>`;
  $("#out").onclick = () => TTCAuth.signOut();
}
const ALL_TABS = [["posts", "📝", "עדכונים"], ["push", "🔔", "התראה"], ["members", "👥", "נרשמים"], ["signups", "🏃", "הרשמות"], ["visits", "📈", "כניסות"], ["managers", "🔑", "מנהלים"], ["more", "⋯", "עוד"]];
// a manager publishes and edits updates only (the rules enforce the same)
let TABS = ALL_TABS;
function tabs() {
  const bar = $("#tabbar"); bar.hidden = false;
  bar.innerHTML = TABS.map(([k, i, l]) => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${k === TAB}"><span class="ic" aria-hidden="true">${i}</span>${l}</button>`).join("");
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) go(b.dataset.tab); });
function go(t) { if (!TABS.some((x) => x[0] === t)) t = "posts"; TAB = t; tabs(); try { history.replaceState(null, "", "#" + t); } catch (e) {} ({ posts, push, members, signups, visits, managers, more })[t](); scrollTo(0, 0); }

addEventListener("ttc-auth-ready", () => {
  A = TTCAuth.admin;
  TTCAuth.onUser(async (u) => {
    // never straight in: a session left from an earlier visit is closed, so every visit starts with the Google sign-in
    if (u && !ASKED) { await TTCAuth.signOut(); return; }
    USER = u;
    if (!u) return signedOut();
    if (await isOwner(u.email)) { ROLE = "owner"; TABS = ALL_TABS; }
    else if (await TTCAuth.isManager()) { ROLE = "manager"; TABS = ALL_TABS.filter((x) => x[0] === "posts" || x[0] === "more"); }
    else return notOwner();
    try { localStorage.setItem("ttc_admin", "1"); } catch (e) {} // the portal shows the ניהול tab on this device only
    const h = (location.hash || "").slice(1);
    go(TABS.some((t) => t[0] === h) ? h : "posts");
  });
}, { once: true });
const sc = document.createElement("script"); sc.src = "auth-admin.js"; document.head.appendChild(sc);
// left in the background for 10 minutes: closed again, sign in to continue
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (USER && hiddenAt && Date.now() - hiddenAt > 10 * 60e3) { ASKED = false; TTCAuth.signOut(); }
});

/* ---------- updates (boardPosts) ---------- */
async function posts() {
  main.innerHTML = `<section class="screen"><div class="row" style="justify-content:space-between"><h2>עדכונים בפורטל</h2><button class="btn" id="new" type="button">+ עדכון חדש</button></div><div id="pl" class="list"><div class="muted">טוען…</div></div></section>`;
  $("#new").onclick = () => postForm(null);
  let list = [];
  try { list = await run(() => A.posts()); } catch (e) { $("#pl").innerHTML = '<div class="err">לא הצלחנו לטעון.</div>'; return; }
  list.sort((a, b) => (b.pin - a.pin) || String(b.date).localeCompare(String(a.date)));
  $("#pl").innerHTML = list.length ? list.map((p) => `<div class="card"><div class="item"><div class="thumb" data-img="${esc(p.img || "")}"></div><div>
      <h3>${esc(p.title)}</h3><div class="muted">${esc(p.date)}</div>
      <div class="tags">${p.hidden ? '<span class="tag off">מוסתר</span>' : '<span class="tag">גלוי</span>'}${p.pin ? '<span class="tag">נעוץ</span>' : ""}${p.banner ? '<span class="tag">באנר</span>' : ""}${p.popup ? `<span class="tag">חלון הרשמה · ${esc(EVENTS[p.popup.event] || p.popup.event)}</span>` : ""}</div>
      <div class="row"><button class="btn ghost" data-edit="${esc(p.id)}" type="button">עריכה</button><button class="btn ghost" data-hide="${esc(p.id)}" type="button">${p.hidden ? "הצגה" : "הסתרה"}</button><button class="btn warn" data-del="${esc(p.id)}" type="button">מחיקה</button></div>
    </div></div></div>`).join("") : '<div class="card muted">עוד אין עדכונים.</div>';
  for (const t of main.querySelectorAll(".thumb[data-img]")) { const id = t.dataset.img; if (!id) continue; A.image(id).then((src) => { if (/^data:image\//.test(src)) t.innerHTML = `<img src="${src}" alt="">`; }).catch(() => {}); }
  const byId = (id) => list.find((p) => p.id === id);
  main.onclick = async (e) => {
    const ed = e.target.closest("[data-edit]"), hi = e.target.closest("[data-hide]"), de = e.target.closest("[data-del]");
    if (ed) postForm(byId(ed.dataset.edit));
    if (hi) { const p = byId(hi.dataset.hide); await run(() => A.savePost(p.id, { ...p, hidden: !p.hidden }), p.hidden ? "העדכון מוצג" : "העדכון הוסתר"); posts(); }
    if (de) { const p = byId(de.dataset.del); if (!confirm(`למחוק את "${p.title}"?`)) return; await run(() => A.deletePost(p.id), "נמחק"); if (p.img) A.deleteImage(p.img).catch(() => {}); posts(); }
  };
}

// תמונה → JPEG דחוס (עד 1000px, עד ~450KB) כדי שייטען מהר בקליטה חלשה
function compress(file) {
  return new Promise((ok, no) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.8, 0.7, 0.6, 0.5, 0.4]) { const d = c.toDataURL("image/jpeg", q); if (d.length <= 450000) return ok(d); }
      no(new Error("too big"));
    };
    img.onerror = () => no(new Error("bad image"));
    img.src = url;
  });
}

async function postForm(p) {
  const isNew = !p; p = p || { title: "", text: "", date: today(), link: "", linkText: "", banner: false, pin: false, hidden: false };
  const ev = p.popup || null;
  main.onclick = null;
  main.innerHTML = `<section class="screen"><h2>${isNew ? "עדכון חדש" : "עריכת עדכון"}</h2><form class="form card" id="pf" novalidate>
    <label>כותרת<input type="text" id="fT" maxlength="90" value="${esc(p.title)}" required></label>
    <label>טקסט<textarea id="fX" maxlength="1200">${esc(p.text)}</textarea></label>
    <div class="two"><label>תאריך<input type="date" id="fD" value="${esc(p.date)}"></label><label>טקסט לכפתור<input type="text" id="fLT" maxlength="30" value="${esc(p.linkText)}" placeholder="לפרטים"></label></div>
    <label>קישור (רשות)<input type="url" id="fL" maxlength="300" value="${esc(p.link)}" placeholder="https://…" dir="ltr"></label>
    <label>תמונה (רשות)<input type="file" id="fI" accept="image/*"></label>
    <div id="fIP">${p.img ? '<div class="muted">טוען תמונה…</div>' : ""}</div>
    <label class="chk"><input type="checkbox" id="fP" ${p.pin ? "checked" : ""}>נעוץ למעלה</label>
    <label class="chk"><input type="checkbox" id="fB" ${p.banner ? "checked" : ""}>להציג כבאנר בראש המסך</label>
    <label class="chk"><input type="checkbox" id="fH" ${p.hidden ? "checked" : ""}>מוסתר (טיוטה)</label>
    <div class="card" style="background:var(--tint);border:0;margin:0">
      <label class="chk"><input type="checkbox" id="fE" ${ev ? "checked" : ""}>חלון קופץ עם הרשמה לאירוע</label>
      <div id="fEB" ${ev ? "" : "hidden"} class="form" style="margin-top:10px">
        <label>אירוע<select id="fEv">${Object.entries(EVENTS).map(([k, v]) => `<option value="${k}"${ev && ev.event === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
        <label>מקצים (מופרדים בפסיק, עד 20 תווים כל אחד)<input type="text" id="fHe" value="${esc(ev ? ev.heats.join(", ") : "4 ק״מ (משפחות), 10 ק״מ, 21 ק״מ")}"></label>
        <label>החלון מופיע עד תאריך<input type="date" id="fU" value="${esc(ev && ev.until || "")}"></label>
      </div>
    </div>
    <div class="err" id="fErr" role="alert"></div>
    <div class="row"><button class="btn" id="fS" type="submit">${isNew ? "פרסום" : "שמירה"}</button><button class="btn ghost" id="fC" type="button">ביטול</button></div>
  </form></section>`;
  let newImg = null, dropImg = false;
  const showImg = (src) => { $("#fIP").innerHTML = src ? `<img class="preview" src="${src}" alt=""><button class="btn ghost" id="fIR" type="button" style="margin-top:8px">הסרת התמונה</button>` : ""; const r = $("#fIR"); if (r) r.onclick = () => { newImg = null; dropImg = true; $("#fI").value = ""; showImg(""); }; };
  if (p.img) A.image(p.img).then((s) => { if (!newImg && !dropImg) showImg(/^data:image\//.test(s) ? s : ""); }).catch(() => showImg(""));
  $("#fI").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { newImg = await compress(f); dropImg = false; showImg(newImg); } catch (x) { $("#fErr").textContent = "לא הצלחנו לקרוא את התמונה. נסו תמונה אחרת."; } };
  $("#fE").onchange = (e) => { $("#fEB").hidden = !e.target.checked; };
  $("#fC").onclick = posts;
  $("#pf").onsubmit = async (e) => {
    e.preventDefault(); const err = $("#fErr"); err.textContent = "";
    const title = $("#fT").value.trim(), link = $("#fL").value.trim(), date = $("#fD").value || today();
    if (!title) return (err.textContent = "חסרה כותרת.");
    if (link && !/^https:\/\//.test(link)) return (err.textContent = "הקישור חייב להתחיל ב-https://");
    let popup = null;
    if ($("#fE").checked) {
      const heats = $("#fHe").value.split(",").map((x) => x.trim()).filter(Boolean);
      if (!heats.length || heats.length > 6 || heats.some((h) => h.length > 20)) return (err.textContent = "צריך בין מקצה אחד לשישה, כל אחד עד 20 תווים.");
      popup = { event: $("#fEv").value, heats }; const u = $("#fU").value; if (u) popup.until = u;
    }
    $("#fS").disabled = true;
    try {
      let img = dropImg ? null : p.img || null; const old = p.img;
      if (newImg) img = await run(() => A.uploadImage(newImg));
      await run(() => A.savePost(isNew ? null : p.id, { title, text: $("#fX").value.trim(), date, link, linkText: $("#fLT").value.trim(), pin: $("#fP").checked, banner: $("#fB").checked, hidden: $("#fH").checked, img, popup, authorName: (USER.name || "").split(" ")[0].slice(0, 60) }), isNew ? "פורסם ✓" : "נשמר ✓");
      if (old && old !== img) A.deleteImage(old).catch(() => {});
      posts();
    } catch (x) { $("#fS").disabled = false; err.textContent = "לא נשמר. בדקו את הפרטים ואת החיבור ונסו שוב."; }
  };
}

/* ---------- push ---------- */
async function push() {
  main.onclick = null;
  main.innerHTML = `<section class="screen"><h2>התראה לטלפונים</h2>
    <div class="stat"><div><b id="dev">…</b><small>מכשירים מאושרים</small></div><div><b id="sentN">…</b><small>נשלחו לאחרונה</small></div><div><b>~10</b><small>דקות עד שליחה</small></div></div>
    <form class="form card" id="pf" novalidate>
      <label>כותרת<input type="text" id="pT" maxlength="60" required placeholder="למשל: האימון היום בוטל"></label>
      <label>טקסט<textarea id="pB" maxlength="180" placeholder="פרט אחד או שניים"></textarea></label>
      <div class="err" id="pErr" role="alert"></div>
      <div id="pConf" hidden class="card" style="background:var(--tint);border:0;margin:0"><b>לשלוח לכל המכשירים?</b><div class="muted">אי אפשר לבטל אחרי השליחה.</div><div class="row" style="margin-top:8px"><button class="btn" id="pYes" type="button">כן, לשלוח</button><button class="btn ghost" id="pNo" type="button">לא</button></div></div>
      <button class="btn" id="pGo" type="submit">המשך</button>
    </form>
    <h2 style="margin-top:18px">אחרונות</h2><div id="pl" class="list"><div class="muted">טוען…</div></div></section>`;
  A.devices().then((n) => { $("#dev").textContent = n; }).catch(() => { $("#dev").textContent = "—"; });
  const load = async () => {
    try {
      const l = await A.pushes();
      $("#sentN").textContent = l.filter((x) => x.sentAt).length;
      $("#pl").innerHTML = l.length ? l.map((x) => `<div class="card"><b>${esc(x.title)}</b><div class="muted">${esc(x.body)}</div><div class="tags"><span class="tag ${x.sentAt ? "" : x.expiredAt ? "bad" : "off"}">${x.sentAt ? `נשלח · ${x.sent ?? "?"} מכשירים` : x.expiredAt ? "פג תוקף" : "ממתין לשליחה"}</span><span class="tag off">${esc(fmtDate(x.createdAt))}</span></div></div>`).join("") : '<div class="card muted">עוד לא נשלחו התראות מכאן.</div>';
    } catch (e) { $("#pl").innerHTML = '<div class="err">לא הצלחנו לטעון.</div>'; }
  };
  load();
  $("#pf").onsubmit = (e) => { e.preventDefault(); if (!$("#pT").value.trim()) return ($("#pErr").textContent = "חסרה כותרת."); $("#pErr").textContent = ""; $("#pConf").hidden = false; $("#pGo").hidden = true; };
  $("#pNo").onclick = () => { $("#pConf").hidden = true; $("#pGo").hidden = false; };
  $("#pYes").onclick = async () => {
    $("#pYes").disabled = true;
    try { await run(() => A.push($("#pT").value.trim().slice(0, 60), $("#pB").value.trim().slice(0, 180), ""), "נכנס לתור. יישלח תוך כ-10 דקות"); $("#pT").value = $("#pB").value = ""; $("#pConf").hidden = true; $("#pGo").hidden = false; load(); }
    catch (x) {} finally { $("#pYes").disabled = false; }
  };
}

/* ---------- members (boardMembers + matches) ---------- */
async function members() {
  main.onclick = null;
  main.innerHTML = `<section class="screen"><h2>נרשמו בפורטל</h2><div class="stat"><div><b id="mT">…</b><small>נרשמו</small></div><div><b id="mM">…</b><small>זוהו כשחקנים/הורים</small></div><div><b id="mN">…</b><small>לא נמצאו</small></div></div>
    <input class="search" id="q" type="search" placeholder="חיפוש לפי שם או טלפון"><div id="ml" class="list"><div class="muted">טוען…</div></div></section>`;
  let list = [];
  try { list = await run(() => A.members()); } catch (e) { $("#ml").innerHTML = '<div class="err">לא הצלחנו לטעון.</div>'; return; }
  const ms = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : 0);
  list.sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  $("#mT").textContent = list.length;
  $("#mM").textContent = list.filter((m) => m.match && m.match.status === "matched").length;
  $("#mN").textContent = list.filter((m) => m.match && m.match.status === "not-found").length;
  const draw = () => {
    const q = $("#q").value.trim().toLowerCase();
    const l = list.filter((m) => !q || (m.name || "").toLowerCase().includes(q) || (m.phone || "").includes(q.replace(/\D/g, "")));
    $("#ml").innerHTML = l.map((m) => `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(m.name)}</b><span class="tag ${!m.match ? "off" : m.match.status === "matched" ? "" : "bad"}">${!m.match ? "בבדיקה" : m.match.status === "matched" ? "נמצא ✓" : "לא נמצא"}</span></div>
      <div class="muted"><a href="tel:${esc(m.phone)}" dir="ltr">${esc(m.phone)}</a> · ${esc(m.email)}</div><div class="muted">${esc(fmtDate(m.createdAt))}${m.ref ? " · הגיע/ה דרך הזמנה" : ""}</div>
      <div class="row" style="margin-top:8px"><button class="btn ghost" style="min-height:38px" data-medit="${esc(m.id)}" type="button">עריכה</button><button class="btn ghost" style="min-height:38px" data-mmgr="${esc(m.id)}" type="button">להפוך למנהל</button><button class="btn warn" style="min-height:38px" data-mdel="${esc(m.id)}" type="button">מחיקה</button></div></div>`).join("") || '<div class="card muted">אין תוצאות.</div>';
  };
  $("#q").oninput = draw; draw();
  main.onclick = async (e) => {
    const ed = e.target.closest("[data-medit]"), de = e.target.closest("[data-mdel]"), mg = e.target.closest("[data-mmgr]");
    const m = list.find((x) => x.id === (ed || de || mg || {}).dataset?.[ed ? "medit" : de ? "mdel" : "mmgr"]);
    if (!m) return;
    if (ed) {
      const name = prompt("שם מלא", m.name || ""); if (name === null) return;
      const phone = prompt("טלפון נייד", m.phone || ""); if (phone === null) return;
      const ph = phone.replace(/[\s-]/g, "");
      if (!name.trim() || !/^(\+?972|0)5\d{8}$/.test(ph)) return toast("שם או טלפון לא תקינים");
      await run(() => A.updateMember(m.id, { name: name.trim().slice(0, 80), phone: ph }), "הפרטים עודכנו"); members();
    }
    if (de) { if (!confirm(`למחוק את ${m.name} מהנרשמים? הוא יתבקש להירשם שוב בכניסה הבאה.`)) return; await run(() => A.deleteMember(m.id), "נמחק"); members(); }
    if (mg) { if (!m.email) return toast("אין לנרשם הזה כתובת ג'ימייל"); if (!confirm(`להפוך את ${m.name} למנהל? הוא יוכל לפרסם ולערוך עדכונים בפורטל.`)) return; await run(() => A.addManager(m.email, (m.name || "").slice(0, 60)), "נוסף כמנהל"); }
  };
}

/* ---------- managers (boardManagers): owner only ---------- */
async function managers() {
  main.onclick = null;
  main.innerHTML = `<section class="screen"><h2>מנהלים</h2><div class="card muted" style="background:var(--tint);border:0">מנהל יכול לפרסם ולערוך עדכונים בפורטל. הוא לא רואה נרשמים, טלפונים או הרשמות, ולא שולח התראות. הוא נכנס עם חשבון הג'ימייל שהוספת כאן.</div>
    <form class="form card" id="mf" novalidate><label>כתובת ג'ימייל<input type="text" id="mE" inputmode="email" dir="ltr" placeholder="name@gmail.com"></label><label>שם<input type="text" id="mN" maxlength="60"></label><div class="err" id="mErr" role="alert"></div><button class="btn" type="submit">הוספת מנהל</button></form>
    <div id="mgl" class="list"><div class="muted">טוען…</div></div></section>`;
  const load = async () => {
    let l = [];
    try { l = await run(() => A.managers()); } catch (e) { $("#mgl").innerHTML = '<div class="err">לא הצלחנו לטעון.</div>'; return; }
    $("#mgl").innerHTML = l.length ? l.map((m) => `<div class="card"><div class="row" style="justify-content:space-between"><div><b>${esc(m.name || "")}</b><div class="muted" dir="ltr" style="text-align:right">${esc(m.email)}</div></div><button class="btn warn" style="min-height:38px" data-rm="${esc(m.email)}" type="button">הסרה</button></div></div>`).join("") : '<div class="card muted">עוד אין מנהלים חוץ ממך.</div>';
  };
  load();
  $("#mf").onsubmit = async (e) => {
    e.preventDefault(); const em = $("#mE").value.trim().toLowerCase(), nm = $("#mN").value.trim();
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(em)) return ($("#mErr").textContent = "כתובת לא תקינה.");
    $("#mErr").textContent = "";
    try { await run(() => A.addManager(em, nm.slice(0, 60)), "נוסף כמנהל"); $("#mE").value = $("#mN").value = ""; load(); } catch (x) {}
  };
  main.onclick = async (e) => { const b = e.target.closest("[data-rm]"); if (!b) return; if (!confirm(`להסיר את ${b.dataset.rm} מהמנהלים?`)) return; await run(() => A.removeManager(b.dataset.rm), "הוסר"); load(); };
}

/* ---------- event signups ---------- */
async function signups() {
  main.innerHTML = `<section class="screen"><h2>הרשמות לאירועים</h2><div class="row" style="margin-bottom:12px"><a class="btn ghost" href="${SIGNUP_SHEET}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">פתיחת הגיליון בדרייב</a></div><div id="sl"><div class="muted">טוען…</div></div></section>`;
  let list = [];
  try { list = await run(() => A.signups()); } catch (e) { $("#sl").innerHTML = '<div class="err">לא הצלחנו לטעון.</div>'; return; }
  const by = {}; for (const s of list) (by[s.event] = by[s.event] || []).push(s);
  $("#sl").innerHTML = Object.keys(by).length ? Object.entries(by).map(([ev, l]) => {
    const heats = {}; for (const s of l) heats[s.heat] = (heats[s.heat] || 0) + 1;
    return `<div class="card"><h3 style="margin:0 0 6px">${esc(EVENTS[ev] || ev)} · ${l.length} משתתפים</h3><div class="tags">${Object.entries(heats).map(([h, n]) => `<span class="tag">${esc(h)} · ${n}</span>`).join("")}</div>
      ${l.sort((a, b) => String(a.byName).localeCompare(String(b.byName), "he")).map((s) => `<div style="border-top:1px solid var(--line);padding:8px 0"><div class="row" style="justify-content:space-between"><b>${esc(s.firstName)} ${esc(s.lastName)}</b><button class="btn warn" style="min-height:36px;padding:0 12px" data-sdel="${esc(s.id)}" type="button">ביטול</button></div>
        <div class="muted">${esc(s.heat)} · ${s.gender === "נ" ? "נקבה" : "זכר"} · ${esc(s.birth)} · חולצה ${esc(s.shirt)} · ${esc(s.city)}</div><div class="muted">נרשם ע"י ${esc(s.byName)} · <a href="tel:${esc(s.phone)}" dir="ltr">${esc(s.phone)}</a></div></div>`).join("")}</div>`;
  }).join("") : '<div class="card muted">עוד אין הרשמות.</div>';
  main.onclick = async (e) => { const d = e.target.closest("[data-sdel]"); if (!d) return; if (!confirm("לבטל את ההרשמה של המשתתף הזה?")) return; await run(() => A.deleteSignup(d.dataset.sdel), "ההרשמה בוטלה"); signups(); };
}

/* ---------- visits: one doc per device per day, name typed once by the visitor (optional) ---------- */
async function visits() {
  main.onclick = null;
  main.innerHTML = `<section class="screen"><h2>כניסות לפורטל</h2><div id="vl"><div class="muted">טוען…</div></div></section>`;
  const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const ago = (n) => ymd(new Date(Date.now() - n * 86400e3));
  let list = [];
  try { list = await run(() => A.visits(ago(29))); } catch (e) { $("#vl").innerHTML = '<div class="err">לא הצלחנו לטעון.</div>'; return; }
  const uniq = (from) => new Set(list.filter((x) => x.day >= from).map((x) => x.v)).size;
  const by = {}; for (const x of list) { const p = (by[x.v] = by[x.v] || { days: 0, last: "" }); p.days++; if (x.day >= p.last) { p.last = x.day; p.n = x.n || p.n; p.r = x.r || p.r; p.d = x.d; } else { p.n = p.n || x.n; p.r = p.r || x.r; } }
  const people = Object.values(by).sort((a, b) => b.last.localeCompare(a.last) || String(a.n || "~").localeCompare(String(b.n || "~"), "he"));
  const day = (d) => `${d.slice(6)}/${d.slice(4, 6)}`;
  const named = people.filter((p) => p.n).length;
  $("#vl").innerHTML = `<div class="stat"><div><b>${uniq(ago(0))}</b><small>היום</small></div><div><b>${uniq(ago(6))}</b><small>7 ימים</small></div><div><b>${uniq(ago(29))}</b><small>30 ימים</small></div></div>
    <div class="muted" style="margin:-4px 0 12px">מכשירים שונים שנכנסו (מכשיר נספר פעם אחת ביום). ${named} מתוך ${people.length} כתבו שם.</div>
    <input class="search" id="vq" type="search" placeholder="חיפוש שם">
    <div class="list" id="vp">${people.map((p) => `<div class="card" data-n="${esc(p.n || "")}"><div class="row" style="justify-content:space-between"><b>${p.n ? esc(p.n) : '<span class="muted">בלי שם</span>'}</b><span class="muted">${day(p.last)}</span></div><div class="tags">${p.r ? `<span class="tag">${esc(p.r)}</span>` : ""}<span class="tag off">${p.days} ${p.days === 1 ? "יום" : "ימים"}</span>${p.d === "desktop" ? '<span class="tag off">מחשב</span>' : ""}</div></div>`).join("") || '<div class="card muted">עוד אין כניסות.</div>'}</div>`;
  $("#vq").oninput = (e) => { const q = e.target.value.trim(); document.querySelectorAll("#vp [data-n]").forEach((c) => (c.hidden = q && !c.dataset.n.includes(q))); };
}

/* ---------- more ---------- */
function more() {
  main.onclick = null;
  const url = "https://shahar1987.github.io/ttc-club-board/";
  main.innerHTML = `<section class="screen"><h2>עוד</h2><div class="card links">
    <a href="./">הפורטל <span>←</span></a>
    <a href="https://www.facebook.com/TTCMH" target="_blank" rel="noopener">פייסבוק של המועדון <span>↗</span></a>
    <a href="https://www.instagram.com/ttcmhr" target="_blank" rel="noopener">אינסטגרם של המועדון <span>↗</span></a>
    <a href="${SIGNUP_SHEET}" target="_blank" rel="noopener">גיליון ההרשמות לאירועים <span>↗</span></a>
    <a href="https://www.tttm.co.il/c/160/" target="_blank" rel="noopener">המועדון באתר האיגוד <span>↗</span></a></div>
    <div class="card"><b>קישור לשליחה להורים ולשחקנים</b><div class="muted" dir="ltr" style="text-align:left;margin:6px 0">${url}</div><button class="btn" id="cp" type="button">העתקת הקישור</button></div>
    <div class="card muted">תוצאות, טבלאות ודירוג מתעדכנים לבד מאתר האיגוד. מחובר/ת כ-${esc(USER.email)}${ROLE === "manager" ? " (מנהל: פרסום ועריכת עדכונים)" : ""}</div>
    <button class="btn ghost" id="out" type="button">התנתקות</button></section>`;
  $("#cp").onclick = async () => { try { await navigator.clipboard.writeText(url); toast("הקישור הועתק"); } catch (e) { toast(url); } };
  $("#out").onclick = () => TTCAuth.signOut();
}
