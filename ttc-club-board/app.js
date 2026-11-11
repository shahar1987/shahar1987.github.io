"use strict";
/* ---------- anonymous stats -> Google Sheet in the club Drive (append-only); no names or IPs ---------- */
const STATS_URL="";
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
let CONSENT=store.get("ttc_consent"); // "yes" | "no" | null (not asked yet)
const vid=()=>{let v=store.get("ttc_v");if(!v){v=Math.random().toString(36).slice(2,12);store.set("ttc_v",v)}return v};
const SRC=(()=>{const x=location.search+" "+document.referrer;return /fbclid|facebook|fb\.com/i.test(x)?"facebook":/instagram|igsh/i.test(x)?"instagram":/whatsapp|wa\.me/i.test(x)?"whatsapp":document.referrer?"other":"direct"})();
const DEV=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?"mobile":"desktop";
const QUEUE=[];let qTimer=0;
function track(t,n){if(!STATS_URL||CONSENT!=="yes")return;QUEUE.push({t,n:String(n||"").slice(0,80),v:vid(),s:SRC,d:DEV});clearTimeout(qTimer);qTimer=setTimeout(flush,1500)}
function flush(){if(!STATS_URL||!QUEUE.length)return;try{fetch(STATS_URL,{method:"POST",mode:"no-cors",keepalive:true,body:JSON.stringify(QUEUE.splice(0,20))})}catch(e){}}
addEventListener("pagehide",flush);


/* ---------- helpers ---------- */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const RM=matchMedia("(prefers-reduced-motion: reduce)");
const CAT={S:"בוגרים",S40:"ותיקים 40+",S50:"ותיקים 50+",S60:"ותיקים 60+",S70:"ותיקים 70+",J19:"נוער עד 19",Y17:"נוער עד 17",C14:"עד 15",C15:"עד 15",M13:"עד 13",M12:"עד 13",B11:"עד 11",B10:"עד 11",B9:"עד 11"};
const DAYS=["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
let D=null,POSTS=[];
if(top!==self){try{top.location=location.href}catch(e){}document.documentElement.innerHTML="";throw new Error("framed")} // no framing of the board
const safeUrl=u=>/^https:\/\/[^\s"'<>]+$/.test(u||"")?u:"#";
const pick=(v,re,d="")=>typeof v==="string"&&re.test(v)?v:d;
const num=(v,d=0)=>v!==null&&v!==""&&Number.isFinite(+v)?+v:d;
const numOrNull=v=>v===null||v===undefined||v===""||!Number.isFinite(+v)?null:+v;
const str=(v,n=120)=>typeof v==="string"?v.slice(0,n):"";
const CODE=/^[A-Za-z0-9]{1,8}$/,DATE=/^\d{2}\/\d{2}\/\d{2}$/,TIME=/^\d{1,2}:\d{2}$/,RES=/^\d{1,2}:\d{1,2}$/;
// data.json comes from scraped pages: force every field into the shape the page expects before anything renders
function cleanData(d){
  const teams={};for(const[k,v]of Object.entries(d.teams||{}))if(CODE.test(k))teams[k]=str(v,80);
  return{
    updated:str(d.updated,40),nextRanking:pick(d.nextRanking,DATE),teams,
    ours:(d.ours||[]).filter(c=>teams[c]),
    leagues:(d.leagues||[]).filter(l=>/^[a-z0-9-]{1,30}$/i.test(l.id)).map(l=>({id:l.id,name:str(l.name,60),group:str(l.group,40),short:str(l.short,30),url:safeUrl(l.url),
      ourTeams:(l.ourTeams||[]).filter(c=>teams[c]),
      standings:(l.standings||[]).filter(r=>teams[r.t]).map(r=>({t:r.t,p:num(r.p),w:num(r.w),d:num(r.d),l:num(r.l),pts:num(r.pts)})),
      matches:(l.matches||[]).filter(m=>teams[m.h]&&teams[m.a]&&DATE.test(m.d)).map(m=>({r:Math.max(1,Math.floor(num(m.r,1))),d:m.d,t:pick(m.t,TIME,"20:00"),h:m.h,a:m.a,res:pick(m.res,RES),w:teams[m.w]?m.w:""}))})),
    rosters:Object.fromEntries(Object.entries(d.rosters||{}).filter(([k])=>teams[k]).map(([k,v])=>[k,(v||[]).map(x=>Math.floor(num(x,-1))).filter(x=>x>0)])),
    players:(d.players||[]).filter(x=>num(x.id,-1)>0&&typeof x.n==="string").map(x=>({id:Math.floor(+x.id),n:str(x.n,60),c:pick(x.c,CODE,"S"),rank:numOrNull(x.rank),ch:numOrNull(x.ch),pts:num(x.pts)})),
    training:(d.training||[]).map(v=>({v:str(v.v,40),g:(v.g||[]).filter(Array.isArray).map(r=>r.slice(0,4).map(x=>str(x,60)))})),
    events:(d.events||[]).filter(e=>Array.isArray(e)&&DATE.test(e[0])).map(e=>[e[0],str(e[1],80),safeUrl(e[2])])
  };
}
// children (under-18 categories) show as first name + last initial, because the same page shows where and when training happens
const ADULT=/^S(\d0)?$/;
const dn=p=>{if(ADULT.test(p.c))return p.n;const w=p.n.trim().split(/\s+/);return w.length>1?w[0]+" "+w[w.length-1][0]+"׳":w[0]};
const when=(d,t)=>{const[dd,mm,yy]=d.split("/");const[h,mi]=(t||"00:00").split(":");return new Date(2000+ +yy,mm-1,+dd,+h,+mi)}; // viewers are in Israel; local clock is the venue clock
const dshort=d=>{const x=when(d);return `${DAYS[x.getDay()]} ${x.getDate()}.${x.getMonth()+1}`};
const ours=c=>D.ours.includes(c);
const short=c=>(D.teams[c]||c).replace("הפועל מבואות חרמון","מבואות חרמון").replace("כרמל מרכזי טניס שולחן חיפה","כרמל חיפה").replace("עירוני מעלות תרשיחא","מעלות תרשיחא").replace("עמותת קריית מוצקין","קריית מוצקין").replace("הפועל עירוני ","").replace("אליצור ","");
const played=m=>!!m.res;
const haptic=()=>{try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}};
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("on"),1800)}

/* ---------- springs (critically damped by default), interruptible: always start from the live value ---------- */
function spring({from,to,velocity=0,response=.4,damping=1,onUpdate,onDone}){
  const k=Math.pow(2*Math.PI/response,2),c=4*Math.PI*damping/response;let x=from,v=velocity,last=performance.now(),id=0,stopped=false;
  const step=t=>{if(stopped)return;let dt=Math.min(.032,(t-last)/1000);last=t;
    for(let i=0;i<2;i++){const h=dt/2,a=-k*(x-to)-c*v;v+=a*h;x+=v*h}
    if(Math.abs(v)<4&&Math.abs(x-to)<.4){onUpdate(to);onDone&&onDone();return}
    onUpdate(x);id=requestAnimationFrame(step)};
  if(RM.matches){onUpdate(to);onDone&&onDone();return()=>{}}
  id=requestAnimationFrame(step);return()=>{stopped=true;cancelAnimationFrame(id)};
}

/* ---------- tab bar ball: arcs from wherever it is now to the tapped tab ---------- */
const ball=$("#tball");let ballX=0,ballY=0,ballStop=null,squash=null;
function tabCenter(name){const b=$(`.tab[data-go="${name}"]`),bar=$("#tabbar").getBoundingClientRect(),r=b.getBoundingClientRect();return r.left-bar.left+r.width/2}
function moveBall(name,instant){
  const to=tabCenter(name),from=ballX,y0=ballY;ballStop&&ballStop();squash&&squash.cancel();squash=null;
  if(instant||RM.matches){ballX=to;ballY=0;ball.style.transform=`translate(${to}px,0)`;return}
  const dist=Math.abs(to-from)||1,arc=Math.min(26,10+dist*.12);
  ballStop=spring({from,to,response:.5,damping:.82,onUpdate:x=>{ballX=x;const p=Math.min(1,Math.max(0,Math.abs(x-from)/dist));const y=-arc*Math.sin(Math.PI*p)+y0*(1-p);ballY=y;ball.style.transform=`translate(${x}px,${y}px)`},
    onDone:()=>{ballY=0;squash=ball.animate([{transform:`translate(${to}px,0) scale(1.35,.7)`},{transform:`translate(${to}px,0) scale(1)`}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"})}});
}
addEventListener("resize",()=>moveBall(current,true));

/* ---------- screens: direction-aware slide, per-screen scroll is kept ---------- */
const ORDER=["home","leagues","rank","club","comp"];let current="home",swapAnims=[];
function go(name,opts={}){
  if(!ORDER.includes(name))return;
  if(name===current){const s=$("#s-"+name);s.scrollTo({top:0,behavior:RM.matches?"auto":"smooth"});return}
  const from=$("#s-"+current),to=$("#s-"+name),dir=ORDER.indexOf(name)>ORDER.indexOf(current)?1:-1; // RTL: forward = slides in from the left
  swapAnims=[];
  $$(".screen").forEach(s=>{s.getAnimations().forEach(x=>x.cancel());if(s!==from)s.hidden=true;s.style.cssText=""});
  $$(".tab").forEach(t=>t.setAttribute("aria-selected",t.dataset.go===name));
  moveBall(name);if(!opts.quiet)haptic();
  to.hidden=false;to.style.zIndex=1;from.style.pointerEvents="none";
  if(!RM.matches){
    const dx=28*dir;
    const a=from.animate([{transform:"translateX(0)",opacity:1},{transform:`translateX(${dx}%)`,opacity:0}],{duration:300,easing:"cubic-bezier(.4,0,.2,1)",fill:"forwards"});
    const b=to.animate([{transform:`translateX(${-dx}%)`,opacity:0},{transform:"translateX(0)",opacity:1}],{duration:360,easing:"cubic-bezier(.2,.8,.2,1)"});
    a.onfinish=()=>{a.onfinish=null;a.cancel();if(from!==$("#s-"+current))from.hidden=true;from.style.cssText=""};swapAnims=[a,b];
  }else{from.hidden=true;from.style.cssText=""}
  current=name;
  if(!opts.silent){try{history.replaceState(null,"","#"+name)}catch(e){}}
  track("section",name);
  if(name==="rank")introDone.then(growPodium);
  if(name==="leagues")requestAnimationFrame(()=>{placePill($("#lgSeg"));placePill($("#viewSeg"))});
  if(name==="club")requestAnimationFrame(()=>placePill($("#venueSeg")));
}
addEventListener("hashchange",()=>go(location.hash.slice(1),{silent:true,quiet:true}));
document.addEventListener("click",e=>{const g=e.target.closest("[data-go]");if(g){e.preventDefault();go(g.dataset.go)}});
$$(".screen").forEach(s=>s.addEventListener("scroll",()=>{const t=s.querySelector(".top");t&&t.classList.toggle("scrolled",s.scrollTop>4)},{passive:true}));

/* ---------- segmented control pill ---------- */
function placePill(seg){if(!seg||seg.offsetParent===null)return;let p=seg.querySelector(".pill");if(!p){p=document.createElement("span");p.className="pill";seg.prepend(p)}
  const b=seg.querySelector('[aria-selected="true"]');if(!b)return;p.style.width=b.offsetWidth+"px";p.style.transform=`translateX(${b.offsetLeft-3}px)`;p.style.left="3px"}
function segment(seg,onPick){seg.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.getAttribute("aria-selected")==="true")return;
  seg.querySelectorAll("button").forEach(x=>x.setAttribute("aria-selected",x===b));placePill(seg);haptic();onPick(b)})}
addEventListener("resize",()=>$$(".seg").forEach(placePill));

/* ---------- bottom sheet: drag to dismiss with momentum projection and rubber-banding ---------- */
const sheet=$("#sheet"),scrim=$("#scrim");let sheetY=0,sheetH=0,sheetStop=null;
const setY=y=>{sheetY=y;sheet.style.transform=`translateY(${y}px)`;scrim.style.opacity=String(Math.max(0,1-y/Math.max(1,sheetH)))};
let sheetReturn=null;
function openSheet(html){
  const wasHidden=sheet.hidden;if(wasHidden)sheetReturn=document.activeElement;$("#sheetBody").innerHTML=html;$("#sheetBody").scrollTop=0;sheet.hidden=false;scrim.hidden=false;scrim.style.pointerEvents="";
  sheetH=sheet.getBoundingClientRect().height;sheetStop&&sheetStop();
  sheetStop=spring({from:wasHidden?sheetH:Math.min(sheetY,sheetH),to:0,response:.38,damping:.86,onUpdate:setY});
  if(wasHidden)requestAnimationFrame(()=>sheet.focus({preventScroll:true}));
}
function closeSheet(v=0){scrim.style.pointerEvents="none";sheetStop&&sheetStop();sheetStop=spring({from:sheetY,to:sheetH+40,velocity:v,response:.32,damping:1,onUpdate:setY,onDone:()=>{sheet.hidden=true;scrim.hidden=true;sheetReturn&&sheetReturn.focus&&sheetReturn.focus({preventScroll:true});sheetReturn=null}})}
scrim.addEventListener("click",()=>closeSheet());
$("#sheetClose").addEventListener("click",()=>closeSheet());
addEventListener("keydown",e=>{if(e.key==="Escape"&&!sheet.hidden)closeSheet()});
(()=>{let start=null,hist=[];
  sheet.addEventListener("pointerdown",e=>{const body=$("#sheetBody");if(e.target.closest("a,button")&&!e.target.closest("#grab"))return;
    if(!e.target.closest("#grab")&&body.scrollTop>0)return;start={y:e.clientY,base:sheetY,drag:false};hist=[{y:e.clientY,t:performance.now()}]});
  sheet.addEventListener("pointermove",e=>{if(!start)return;const dy=e.clientY-start.y;
    if(!start.drag){if(Math.abs(dy)<8)return;if(dy<0&&!e.target.closest("#grab")){start=null;return}start.drag=true;sheet.setPointerCapture(e.pointerId);sheetStop&&sheetStop()}
    let y=start.base+dy;if(y<0)y=-(-y*sheetH*.55)/(sheetH+.55*-y); // rubber-band past the top
    setY(y);hist.push({y:e.clientY,t:performance.now()});if(hist.length>6)hist.shift()});
  const end=()=>{if(!start)return;const was=start.drag;start=null;if(!was)return;
    const a=hist[0],b=hist[hist.length-1],v=b.t>a.t?(b.y-a.y)/(b.t-a.t)*1000:0;
    const projected=sheetY+(v/1000)*.998/(1-.998);
    if(projected>sheetH*.45)closeSheet(v);else{sheetStop=spring({from:sheetY,to:0,velocity:v,response:.35,damping:.85,onUpdate:setY})}};
  sheet.addEventListener("pointerup",end);sheet.addEventListener("pointercancel",()=>{if(start&&start.drag)sheetStop=spring({from:sheetY,to:0,response:.35,damping:.85,onUpdate:setY});start=null});
})();

/* ---------- home ---------- */
function ourMatches(){return D.leagues.flatMap(l=>l.matches.filter(m=>ours(m.h)||ours(m.a)).map(m=>({...m,lg:l})))}
function renderHome(){
  const all=ourMatches(),now=new Date();
  const upcoming=all.filter(m=>!played(m)&&when(m.d,m.t)>now-3*3600e3).sort((a,b)=>when(a.d,a.t)-when(b.d,b.t));
  const n=upcoming[0];
  if(n){
    const T=when(n.d,n.t),today=T.toDateString()===now.toDateString(),home=ours(n.h);
    const side=c=>`<div class="side${ours(c)?" us":""}"><b>${esc(short(c))}</b><small>${c===n.h?"בית":"חוץ"}</small></div>`;
    $("#hero").innerHTML=`<div class="hero${today?" live":""}" role="group" aria-label="המשחק הבא">
      <div class="kick"><span class="dot"></span>${today?"היום משחקים!":"המשחק הבא שלנו"} · ${esc(n.lg.short)}, מחזור ${n.r}</div>
      <div class="table" role="img" aria-label="${esc(D.teams[n.h])} נגד ${esc(D.teams[n.a])}"><span class="net"></span><span class="pp" aria-hidden="true"><i></i></span>${side(n.h)}<div class="vs">VS</div>${side(n.a)}</div>
      <div class="facts"><span>📅 ${dshort(n.d)}</span><span class="num">🕖 ${n.t}</span><span>📍 ${home?"בית ספר רמת כורזים":"משחק חוץ"}</span></div>
      <div class="count num" id="cd"></div></div>`;
    const tick=()=>{const el=$("#cd");if(!el)return;if(new Date()-T>3*3600e3){renderHome();return}let s=Math.max(0,Math.ceil((T-new Date())/6e4)*60);
      el.innerHTML=s>0?[[Math.floor(s/86400),"ימים"],[Math.floor(s%86400/3600),"שעות"],[Math.floor(s%3600/60),"דקות"]].filter((x,i)=>i>0||x[0]>0).map(([v,l])=>`<span>${v}<small>${l}</small></span>`).join(""):`<span style="font-size:15px">המשחק התחיל · בהצלחה!</span>`};
    tick();clearInterval(renderHome.iv);renderHome.iv=setInterval(tick,30e3);
  }else $("#hero").innerHTML=`<div class="hero"><div class="kick"><span class="dot"></span>אין משחקים קרובים בלוח</div></div>`;
  const card=m=>{const us=ours(m.h)?m.h:m.a,opp=ours(m.h)?m.a:m.h,home=ours(m.h);let res="";
    if(played(m))res=m.w===us?'<span class="badge w">ניצחון</span>':m.w?'<span class="badge l">הפסד</span>':"";
    return `<button class="mcard" data-go="leagues" data-lg="${m.lg.id}" data-r="${m.r}"><div class="lg"><span>${esc(m.lg.short)} · מחזור ${m.r}</span><span class="num">${dshort(m.d)} ${played(m)?"":m.t}</span></div>
      <div class="tm us"><span>${esc(short(us))}</span>${home?'<span class="badge home">בית</span>':'<span class="badge">חוץ</span>'}${res}</div>
      <div class="tm"><span>נגד ${esc(short(opp))}</span>${played(m)?`<span class="badge num">${esc(m.res)}</span>`:""}</div></button>`};
  const rest=upcoming.slice(1,8);$("#nextRail").innerHTML=rest.map(card).join("");$("#nextSec").hidden=!rest.length;
  const res=all.filter(played).sort((a,b)=>when(b.d,b.t)-when(a.d,a.t)).slice(0,8);$("#resRail").innerHTML=res.map(card).join("");$("#resSec").hidden=!res.length;
  const top=D.players.filter(p=>p.rank).sort((a,b)=>a.rank-b.rank)[0];
  $("#tiles").innerHTML=`<button class="tile" data-go="rank"><small>המדורג הגבוה במועדון</small><b>${top?esc(dn(top)):"—"}</b><small class="num">${top?"מקום "+top.rank+" בארץ":""}</small></button>
    <button class="tile cta" data-go="club"><small>מצטרפים?</small><b>אימון ניסיון חינם</b><small>בכל מועד אימון</small></button>`;
}
function renderPosts(){
  const ps=(POSTS||[]).filter(x=>x&&x.title&&!x.hidden);
  const bn=ps.filter(x=>x.banner).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))[0];
  $("#noticeWrap").innerHTML=bn?`<div class="notice" role="status"><b>הודעה</b><span>${esc(bn.title)}${bn.text?" · "+esc(bn.text):""}</span></div>`:"";
  const list=ps.filter(x=>!x.banner).sort((a,b)=>(!!b.pin-!!a.pin)||String(b.date||"").localeCompare(String(a.date||"")));
  const img=u=>IMG_OK.test(u||"")?u:"";
  $("#newsRail").innerHTML=list.map(x=>`<button class="pcard" data-post="${POSTS.indexOf(x)}">${img(x.img)?`<img src="${img(x.img)}" alt="" loading="lazy">`:""}<div class="in"><span class="dt">${/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?new Date(x.date+"T12:00").toLocaleDateString("he-IL",{day:"numeric",month:"long"}):""}${x.pin?" · נעוץ":""}</span><h3>${esc(x.title)}</h3>${x.text?`<p>${esc(x.text)}</p>`:""}</div></button>`).join("");
  $("#newsSec").hidden=!list.length;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-post]");if(!b)return;const x=POSTS[+b.dataset.post];if(!x)return;if(x.popup&&x===activeEvent())return openEvent();
  const img=IMG_OK.test(x.img||"")?x.img:"",link=/^https:\/\//.test(x.link||"")?x.link:"";
  openSheet(`${img?`<img class="post-img" src="${img}" alt="">`:""}<h2 class="post-h">${esc(x.title)}</h2>${x.text?`<div class="post-t">${esc(x.text)}</div>`:""}${link?`<a class="btn" style="margin-top:14px" href="${esc(link)}" target="_blank" rel="noopener">${esc(x.linkText||"לפרטים")}</a>`:""}`);track("post",x.title)});

/* ---------- leagues ---------- */
let LG=null,VIEW="table",ROUND={};
function renderLeagueTabs(){
  $("#lgSeg").innerHTML=D.leagues.map((l,i)=>`<button role="tab" data-lg="${l.id}" aria-selected="${i===0}">${esc(l.name.replace(" גברים",""))}</button>`).join("");
  LG=D.leagues[0];
  segment($("#lgSeg"),b=>{LG=D.leagues.find(l=>l.id===b.dataset.lg);renderLeague(0);track("league",LG.id)});
  segment($("#viewSeg"),b=>{const old=VIEW;VIEW=b.dataset.v;renderLeague(["table","rounds","ours","squad"].indexOf(VIEW)>["table","rounds","ours","squad"].indexOf(old)?1:-1);track("league",LG.id+":"+VIEW)});
}
function defaultRound(l){const now=new Date();const up=l.matches.filter(m=>!played(m)&&when(m.d,m.t)>now-3*3600e3).sort((a,b)=>when(a.d,a.t)-when(b.d,b.t));return up.length?up[0].r:Math.max(1,...l.matches.map(m=>m.r))}
function mrow(m){const mine=ours(m.h)||ours(m.a),nm=c=>`<span class="${ours(c)?"us":""} ${m.w===c?"wn":""}">${esc(short(c))}</span>`;
  return `<div class="mrow${mine?" mine":""}"><div class="h">${nm(m.h)}</div><div class="sc num">${played(m)?esc(m.res):m.t}</div><div class="a">${nm(m.a)}</div><div class="when num">${dshort(m.d)}</div></div>`}
function slideIn(el,dir){if(RM.matches||!dir)return;el.animate([{transform:`translateX(${-18*dir}px)`,opacity:0},{transform:"none",opacity:1}],{duration:280,easing:"cubic-bezier(.2,.8,.2,1)"})}
function renderLeague(dir){
  const l=LG,v=$("#lgView");if(!l){v.innerHTML='<div class="empty">אין עדיין נתוני ליגה</div>';$("#lgSrc").textContent="";return}
  $("#lgSrc").innerHTML=`${esc(l.name)} · ${esc(l.group)} · עונת 2026/27 · <a href="${esc(l.url)}" target="_blank" rel="noopener">באתר האיגוד</a>`;
  if(VIEW==="table"){
    v.innerHTML=`<div class="card"><table class="st"><thead><tr><th>#</th><th>קבוצה</th><th>מש׳</th><th>נצ׳</th><th>הפ׳</th><th>נק׳</th></tr></thead><tbody>${l.standings.map((r,i)=>`<tr class="${ours(r.t)?"us":""}"><td><span class="pos">${i+1}</span></td><td>${esc(short(r.t))}</td><td class="num">${r.p}</td><td class="num">${r.w}</td><td class="num">${r.l}</td><td class="num pts">${r.pts}</td></tr>`).join("")}</tbody></table></div>`;
  }else if(VIEW==="rounds"){
    const max=Math.max(1,...l.matches.map(m=>m.r));let r=ROUND[l.id]||(ROUND[l.id]=defaultRound(l));
    const ms=l.matches.filter(m=>m.r===r).sort((a,b)=>when(a.d,a.t)-when(b.d,b.t));
    v.innerHTML=`<div class="stepper"><button id="rPrev" aria-label="המחזור הקודם" ${r<=1?"disabled":""}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button>
      <div class="lbl"><b>מחזור ${r}</b><span>מתוך ${max}</span></div>
      <button id="rNext" aria-label="המחזור הבא" ${r>=max?"disabled":""}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></button></div>
      <div class="card" id="rList">${ms.map(mrow).join("")||'<div class="empty">אין משחקים במחזור הזה</div>'}</div>`;
    $("#rPrev").onclick=()=>{ROUND[l.id]=r-1;renderLeague(-1);track("league",l.id+":r"+(r-1))};
    $("#rNext").onclick=()=>{ROUND[l.id]=r+1;renderLeague(1);track("league",l.id+":r"+(r+1))};
  }else if(VIEW==="ours"){
    const ms=l.matches.filter(m=>ours(m.h)||ours(m.a)).sort((a,b)=>when(a.d,a.t)-when(b.d,b.t));
    const now=new Date(),nextIdx=ms.findIndex(m=>!played(m)&&when(m.d,m.t)>now-3*3600e3);
    v.innerHTML=`<div class="card" id="oursList">${ms.map((m,i)=>mrow(m).replace('class="mrow',`data-i="${i}" class="mrow`)).join("")}</div>`;
    if(nextIdx>2){const el=v.querySelector(`[data-i="${nextIdx-1}"]`);el&&requestAnimationFrame(()=>{$("#s-leagues").scrollTop=el.getBoundingClientRect().top-$("#s-leagues").getBoundingClientRect().top+$("#s-leagues").scrollTop-130})}
  }else{
    v.innerHTML=l.ourTeams.map(t=>`<div class="team-h">${esc(D.teams[t])}</div><div class="chips">${(D.rosters[t]||[]).map(id=>{const p=D.players.find(x=>x.id===id);return p?`<button class="chip" data-pid="${id}">${esc(dn(p))}<i class="num">${p.pts?Math.round(p.pts):"—"}</i></button>`:""}).join("")}</div>`).join("");
  }
  slideIn(v.firstElementChild&&VIEW==="rounds"?v.querySelector(".card"):v,dir);
}
document.addEventListener("click",e=>{const c=e.target.closest(".mcard[data-lg]");if(!c)return;
  const l=D.leagues.find(x=>x.id===c.dataset.lg);if(!l)return;LG=l;VIEW="rounds";ROUND[l.id]=+c.dataset.r;
  $$("#lgSeg button").forEach(b=>b.setAttribute("aria-selected",b.dataset.lg===l.id));$$("#viewSeg button").forEach(b=>b.setAttribute("aria-selected",b.dataset.v==="rounds"));renderLeague(0)},true);

/* ---------- ranking ---------- */
function renderRank(){
  $("#rankSub").textContent=`דירוג ארצי · מתעדכן בסוף כל חודש · הבא ב-${D.nextRanking}`;
  const r=D.players.filter(p=>p.pts>0).sort((a,b)=>b.pts-a.pts),max=r[0]?r[0].pts:1;
  const ini=n=>n.trim()[0]||"";
  const pod=(p,i)=>p?`<button class="pod p${i}" data-pid="${p.id}"><span class="av">${esc(ini(dn(p)))}</span><span class="nm">${esc(dn(p))}</span><span class="pt num">${p.pts.toFixed(0)} נק׳</span><span class="blk num">${i}</span></button>`:"<div></div>";
  $("#podium").innerHTML=pod(r[1],2)+pod(r[0],1)+pod(r[2],3);
  const arrow=p=>p.ch==null?"":p.ch===0?'<small class="same">ללא שינוי</small>':p.ch>0?`<small class="up">▲ ${p.ch}</small>`:`<small class="down">▼ ${-p.ch}</small>`;
  $("#lb").innerHTML=r.slice(3).map((p,i)=>`<button class="lrow" data-pid="${p.id}"><span class="rk num">${i+4}</span><span class="nm"><b>${esc(dn(p))}</b><span>${esc(CAT[p.c]||p.c)}${p.rank?` · מקום ${p.rank} בארץ`:""}</span><div class="bar"><span style="width:${(p.pts/max*100).toFixed(1)}%"></span></div></span><span class="pt num">${p.pts.toFixed(0)}${arrow(p)}</span></button>`).join("");
  // everyone registered with the club shows up, also new players who have no rating yet
  const un=D.players.filter(p=>!p.pts).sort((a,b)=>dn(a).localeCompare(dn(b),"he"));
  if(un.length)$("#lb").insertAdjacentHTML("beforeend",`<div class="lsub">חדשים במועדון · עוד בלי דירוג</div>`+un.map(p=>`<button class="lrow" data-pid="${p.id}"><span class="rk">🌱</span><span class="nm"><b>${esc(dn(p))}</b><span>${esc(CAT[p.c]||p.c)}</span></span><span class="pt"><small class="same">ממתין לדירוג</small></span></button>`).join(""));
  $("#unrated").textContent=un.length?"שחקנים חדשים מקבלים דירוג אחרי המשחקים הרשמיים הראשונים שלהם.":"";
}
let podiumGrown=false;
function growPodium(){if(podiumGrown)return;podiumGrown=true;$("#lb").classList.add("grown");if(RM.matches)return;
  $$(".pod .blk").forEach((b,i)=>b.animate([{transform:"scaleY(0)"},{transform:"scaleY(1.06)",offset:.75},{transform:"scaleY(1)"}],{duration:620,delay:[120,0,220][i]||0,easing:"cubic-bezier(.2,.8,.2,1)",fill:"backwards"}));
  $$(".pod .av").forEach((b,i)=>b.animate([{transform:"translateY(14px)",opacity:0},{transform:"none",opacity:1}],{duration:500,delay:([120,0,220][i]||0)+260,easing:"cubic-bezier(.2,.8,.2,1)",fill:"backwards"}))}
function teamOf(id){for(const t in D.rosters)if(D.rosters[t].includes(id))return D.teams[t];return""}
function showPlayer(id){const p=D.players.find(x=>x.id===id);if(!p)return;
  const club=D.players.filter(x=>x.pts>0).sort((a,b)=>b.pts-a.pts).findIndex(x=>x.id===id)+1;
  const trend=p.ch==null?"—":p.ch===0?"יציב":p.ch>0?`▲ ${p.ch}`:`▼ ${-p.ch}`;
  openSheet(`<div class="pl-cat">${esc(CAT[p.c]||p.c)}${teamOf(id)?" · "+esc(teamOf(id)):""}</div><div class="pl-name">${esc(dn(p))}</div>
    <div class="pl-big"><b class="num" id="plRank">${p.rank?"#"+p.rank:"—"}</b><span>${p.rank?"מקום בדירוג הארצי":"עוד לא דורג. הדירוג נקבע אחרי משחקים רשמיים"}</span></div>
    <div class="pl-grid"><div><small>נקודות</small><b class="num">${p.pts?p.pts.toFixed(0):"0"}</b></div><div><small>במועדון</small><b class="num">${club||"—"}</b></div><div><small>החודש</small><b class="${p.ch>0?"up":p.ch<0?"down":""}">${trend}</b></div></div>
    <a class="link" href="https://www.tttm.co.il/p/${p.id}/" target="_blank" rel="noopener">כרטיס השחקן המלא באתר האיגוד</a>`);
  if(p.rank&&!RM.matches){const el=$("#plRank"),end=p.rank,t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/750),e=1-Math.pow(1-k,3);el.textContent="#"+Math.round(end+(1-e)*500);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
  track("player",dn(p))}
document.addEventListener("click",e=>{const b=e.target.closest("[data-pid]");if(b)showPlayer(+b.dataset.pid)});
$("#q").addEventListener("input",e=>{const v=e.target.value.trim();clearTimeout(e.target.t);if(v.length<3)return;
  e.target.t=setTimeout(()=>{const m=D.players.filter(x=>dn(x).includes(v));if(m.length===1){e.target.blur();showPlayer(m[0].id)}else if(!m.length)toast("לא מצאנו שחקן בשם הזה")},600)});

/* ---------- club ---------- */
function renderClub(){
  $("#venueSeg").innerHTML=D.training.map((v,i)=>`<button role="tab" data-i="${i}" aria-selected="${i===0}">${esc(v.v)}</button>`).join("");
  const slots=i=>{const v=D.training[i];$("#slots").innerHTML=!v?"":v.g.map(([g,d,t,c])=>`<div class="slot"><b>${esc(g)}</b><span class="t num">${esc(t)}</span><span>ימים ${esc(d)}</span><span>מאמן: ${esc(c)}</span></div>`).join("")};
  slots(0);segment($("#venueSeg"),b=>{slots(+b.dataset.i);slideIn($("#slots"),1)});
  const now=new Date(),ev=D.events.filter(e=>when(e[0],"23:59")>=now).sort((a,b)=>when(a[0])-when(b[0]));
  $("#evs").innerHTML=ev.map(([d,n,u])=>{const x=when(d);return `<a class="ev" href="${esc(u)}" target="_blank" rel="noopener"><span class="d num">${x.getDate()}<small>${x.toLocaleDateString("he-IL",{month:"short"})}</small></span><span>${esc(n)}</span><span class="go">להרשמה ←</span></a>`}).join("");
  $("#evNone").hidden=!!ev.length;
  const U=new Date(D.updated);$("#upd").textContent=isNaN(U)?"":"עודכן "+U.toLocaleString("he-IL",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"});
}
$("#copyPhone").addEventListener("click",async()=>{try{await navigator.clipboard.writeText("0504999149");toast("המספר הועתק")}catch(e){toast("050-4999149")}});
document.addEventListener("click",e=>{const a=e.target.closest("[data-soc]");if(a)track("social",a.dataset.soc)});

/* ---------- install to home screen ---------- */
let deferredInstall=null;
const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
// Google refuses sign-in inside apps' built-in browsers; send those visitors to a real browser first
const UA=navigator.userAgent;
const inApp=/FBAN|FBAV|Instagram|Line\/|; wv\)|LinkedInApp|BytedanceWebview|musical_ly|Snapchat|MicroMessenger/i.test(UA)||(/iPhone|iPad|iPod/.test(UA)&&!/Safari\//.test(UA)&&!navigator.standalone);
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e});
addEventListener("appinstalled",()=>{$("#installSec").hidden=true;toast("האפליקציה הותקנה")});
// shown to everyone who isn't already inside the installed app; the button knows the right way per phone
if(!standalone)$("#installSec").hidden=false;
const howTo=(title,steps)=>openSheet(`<h2 class="post-h">${title}</h2><div class="post-t">${steps}</div>`);
$("#installBtn").addEventListener("click",async()=>{track("click","install");
  if(deferredInstall){deferredInstall.prompt();const r=await deferredInstall.userChoice.catch(()=>null);deferredInstall=null;if(r&&r.outcome==="accepted")$("#installSec").hidden=true;return}
  if(inApp)return howTo("קודם פותחים בדפדפן",`הקישור נפתח עכשיו בתוך ${/Instagram/i.test(navigator.userAgent)?"אינסטגרם":"פייסבוק"}, ומשם אי אפשר להתקין.
1. לוחצים על שלוש הנקודות (⋯) למעלה.
2. בוחרים "פתיחה בדפדפן" (${isIOS?"ספארי":"כרום"}).
3. בדפדפן לוחצים שוב על "התקנה".`);
  if(isIOS)return howTo("התקנה באייפון",`1. לוחצים על כפתור השיתוף בתחתית ספארי (ריבוע עם חץ למעלה).
2. גוללים ובוחרים "הוספה למסך הבית".
3. לוחצים "הוסף". הלוגו של המועדון יופיע לצד שאר האפליקציות.`);
  howTo("התקנה באנדרואיד",`1. בכרום, לוחצים על שלוש הנקודות (⋮) למעלה.
2. בוחרים "התקנת אפליקציה" או "הוספה למסך הבית".
3. מאשרים. הלוגו של המועדון יופיע במסך הבית.`)});
/* ---------- auto-update: an installed app stays open for days, so check for a new version whenever it comes back to the screen ---------- */
let BUILD=null,DATA_AT=null,SIGNING=false;
async function checkFresh(){
  const get=u=>fetch(u,{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null);
  const[v,d]=await Promise.all([get("version.json"),get("data.json")]);
  const vv=v&&v.v,du=d&&d.updated;
  if(BUILD===null){if(vv||du){BUILD=vv||"";DATA_AT=du||""}return}
  const changed=(vv&&vv!==BUILD)||(du&&du!==DATA_AT);
  if(!changed)return;
  if(SIGNING||!sheet.hidden||document.activeElement===$("#q"))return; // busy: try again on the next check
  location.reload();
}
checkFresh();
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){checkFresh();swReg&&swReg.update().catch(()=>{})}});
setInterval(()=>{if(document.visibilityState==="visible")checkFresh()},10*60e3);
let swReg=null;
if("serviceWorker" in navigator&&location.protocol==="https:"){
  const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(had&&!SIGNING&&sheet.hidden&&document.activeElement!==$("#q"))location.reload()});
  addEventListener("load",()=>navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(r=>{swReg=r;r.update().catch(()=>{})}).catch(()=>{}));
}

/* ---------- opening: full intro once per visit, a quick fade when coming back in the same session ---------- */
const seen=standalone||!!store.get("ttc_intro");store.set("ttc_intro","1");
if(seen)$("#splash").classList.add("quick");
const introDone=new Promise(r=>setTimeout(r,RM.matches?150:seen?1050:1900));
function hideSplash(){introDone.then(()=>{$("#splash").classList.add("gone");$("#s-home").classList.add("enter-home")})}
/* ---------- boot ---------- */
// updates published by staff with the "boardPosts" permission (attendance app) — public read, no sign-in needed
// pictures in a post: a club file under img/, or an image saved from the admin page (data URL)
const IMG_OK=/^(img\/[\w.-]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/;
// a slow mobile line must never leave people on the opening screen: every startup request gives up in time
const tfetch=(u,o={},ms=6000)=>{const c=new AbortController();setTimeout(()=>c.abort(),ms);return fetch(u,{...o,signal:c.signal})};
async function staffPosts(){try{
  // only visible posts: the rules refuse anything else to the public
  const r=await tfetch("https://firestore.googleapis.com/v1/projects/ttcmh-2a752/databases/(default)/documents:runQuery?key=AIzaSyDhPiyIrP1zOu5bNSpsQDyXFgZBP6rV7vo",{method:"POST",cache:"no-store",headers:{"content-type":"application/json"},
    body:JSON.stringify({structuredQuery:{from:[{collectionId:"boardPosts"}],where:{fieldFilter:{field:{fieldPath:"hidden"},op:"EQUAL",value:{booleanValue:false}}},limit:20}})},4000);
  if(!r.ok)return[];const j=await r.json();
  const v=f=>f?(f.stringValue??f.booleanValue??""):"";
  const pop=f=>{const m=f&&f.mapValue&&f.mapValue.fields;if(!m)return undefined;const heats=((m.heats&&m.heats.arrayValue&&m.heats.arrayValue.values)||[]).map(x=>String(x.stringValue||"")).filter(Boolean);
    return{event:String(v(m.event)),heats,until:String(v(m.until))}};
  const list=(Array.isArray(j)?j:[]).map(x=>x.document).filter(Boolean).map(d=>{const f=d.fields||{};return{id:"s:"+d.name.split("/").pop(),title:String(v(f.title)).slice(0,90),text:String(v(f.text)).slice(0,1200),banner:v(f.banner)===true,pin:v(f.pin)===true,hidden:v(f.hidden)===true,link:String(v(f.link)),linkText:String(v(f.linkText)).slice(0,30),date:String(v(f.date)),imgId:String(v(f.img)),popup:pop(f.popup)}}).filter(x=>x.title);
  // images never change once saved, so each device downloads each one only once
  await Promise.all(list.filter(x=>/^[\w-]{1,40}$/.test(x.imgId)).map(async x=>{const k="ttc_img_"+x.imgId;let d=store.get(k);
    if(!d){try{const r=await tfetch(`https://firestore.googleapis.com/v1/projects/ttcmh-2a752/databases/(default)/documents/boardImages/${x.imgId}?key=AIzaSyDhPiyIrP1zOu5bNSpsQDyXFgZBP6rV7vo`,{},6000);
      if(r.ok){d=String(v(((await r.json()).fields||{}).data));if(IMG_OK.test(d))store.set(k,d)}}catch(e){}}
    if(d&&IMG_OK.test(d))x.img=d}));
  return list;
}catch(e){return[]}}
function boot(){
  for(const f of [renderHome,renderPosts,renderLeagueTabs,()=>renderLeague(0),renderRank,renderClub])try{f()}catch(e){console.error(e)}
  const start=(location.hash||"").slice(1);
  moveBall("home",true);
  hideSplash();
  introDone.then(()=>setTimeout(()=>{if(whoInfo())return logVisit(),maybePopup();whoSheet()},250)); // the event popup needs only the posts, not the Firebase bundle
  if(ORDER.includes(start)&&start!=="home")setTimeout(()=>go(start,{silent:true,quiet:true}),150);
}
Promise.all([
  tfetch("data.json",{cache:"no-store"},12000).then(r=>r.json()),
  tfetch("posts.json",{cache:"no-store"},5000).then(r=>r.ok?r.json():{}).catch(()=>({})),
  staffPosts()
]).then(([d,p,sp])=>{D=cleanData(d);POSTS=(Array.isArray(p.posts)?p.posts:[]).concat(sp);boot()})
 .catch(()=>{hideSplash();moveBall("home",true);$("#hero").innerHTML='<div class="hero"><div class="kick">אין חיבור כרגע. נסו לרענן בעוד רגע.</div></div>'});

/* ---------- analytics consent: asked once, only when stats are switched on; changeable from the footer ---------- */
function setConsent(v){CONSENT=v;store.set("ttc_consent",v);if(v!=="yes")store.set("ttc_v",null);$("#consent").hidden=true;$("#statsState").textContent=v==="yes"?"פעילה":"כבויה";if(v==="yes")track("view","home")}
if(STATS_URL){
  $("#statsPref").hidden=false;$("#statsState").textContent=CONSENT==="yes"?"פעילה":"כבויה";
  if(!CONSENT)introDone.then(()=>setTimeout(()=>{$("#consent").hidden=false},1500));else if(CONSENT==="yes")track("view","home");
  $("#consentYes").onclick=()=>setConsent("yes");$("#consentNo").onclick=()=>setConsent("no");
  $("#statsPref").onclick=()=>{setConsent(CONSENT==="yes"?"no":"yes");toast(CONSENT==="yes"?"הסטטיסטיקה הופעלה":"הסטטיסטיקה כובתה")};
}

/* ---------- personal area: optional Google sign-in (name + phone), stored only for the club manager ---------- */
const GICON='<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
let ME={user:null,member:null,ready:false};
const PHONE_OK=v=>/^(\+?972|0)5\d{8}$/.test(v.replace(/[\s-]/g,""));
// only a device that once got into the dashboard shows its tab; the dashboard itself still asks Google and checks the account
function adminTab(){if(!$("#adminLink")){$("#tabbar").insertAdjacentHTML("beforeend",'<a class="tab" id="adminLink" href="admin.html"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>ניהול</a>');moveBall(current,true)}}
function renderMe(){
  const el=$("#me");$("#meSec").hidden=false;const al=$("#adminLink");al&&al.remove();
  // open portal: no sign-in for visitors (owner's decision 20.10.2026) — the card only offers notifications and inviting a friend
  if(!ME.user){const w=whoInfo(),hi=w&&w.n?`שלום ${esc(w.n.split(" ")[0])} 👋`:"המועדון בכיס";el.innerHTML=`<div class="tx"><b>${hi}</b>עדכונים, משחקים ותחרויות. אפשר לקבל התראות ולהזמין חברים לאימון ניסיון.</div><button class="btn invite" id="invite" type="button">🎁 להזמין חבר/ה לאימון ניסיון</button>`;if(pushAsk())el.insertAdjacentHTML("beforeend",'<button class="btn invite" id="pushOn" type="button">🔔 לקבל התראות מהמועדון</button>');if(store.get("ttc_admin"))adminTab();return}
  if(!ME.member){el.innerHTML=`<div class="tx"><b>עוד צעד קטן</b>נשאר רק להוסיף טלפון.</div><button class="btn" id="meEdit" type="button" style="min-height:44px;padding:8px 14px">השלמה</button>`;return}
  el.innerHTML=`<div class="tx"><b>${esc(ME.member.name)}</b>מחובר/ת · ${esc(ME.user.email)}</div><button class="btn ghost" id="meEdit" type="button" style="min-height:44px;padding:8px 14px">הפרטים שלי</button>`;
  el.insertAdjacentHTML("beforeend",'<button class="btn invite" id="invite" type="button">🎁 להזמין חבר/ה לאימון ניסיון</button>');
  if(pushAsk())el.insertAdjacentHTML("beforeend",'<button class="btn invite" id="pushOn" type="button">🔔 לקבל התראות מהמועדון</button>');
  isOwner(ME.user.email).then(o=>o||(window.TTCAuth&&TTCAuth.isManager?TTCAuth.isManager():false)).then(o=>o&&adminTab());
}
// the owner's address is kept only as a hash in this public code; the dashboard itself checks the Claude account
const OWNER_HASH="01729b4d5d3e455f8bacc0637897aa134b9fb122fc148113f0d0180dfab464f4";
async function isOwner(email){try{const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode((email||"").trim().toLowerCase()));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")===OWNER_HASH}catch(e){return false}}
/* ---------- who's visiting: full name asked once per device (optional), one visit per device per day (owner's request 21.10.2026) ---------- */
const ROLES=["הורה","שחקן/ית","מאמן/ת","אחר"];
function whoInfo(){try{return JSON.parse(store.get("ttc_who")||"null")}catch(e){return null}}
let visitSent=false;
function logVisit(){if(visitSent)return;visitSent=true;const w=whoInfo()||{},d=new Date(),day=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const data={v:vid(),day,d:DEV};if(w.n)data.n=w.n.slice(0,60);if(ROLES.includes(w.r))data.r=w.r;
  const go=()=>TTCAuth.visit&&TTCAuth.visit(data);window.TTCAuth?go():addEventListener("ttc-auth-ready",go,{once:true})}
function whoSheet(){
  openSheet(`<h2 class="post-h">נעים להכיר 👋</h2>
  <form class="form" id="wForm" novalidate>
    <label>שם מלא (פרטי ומשפחה)<input type="text" id="wName" maxlength="60" autocomplete="name" placeholder="למשל: דנה כהן" required></label>
    <div class="chips" id="wRole" role="radiogroup" aria-label="מי את/ה">${ROLES.map(r=>`<button type="button" class="chip" role="radio" aria-checked="false" data-r="${r}">${r}</button>`).join("")}</div>
    <div class="why">שואלים פעם אחת בלבד, כדי שהמועדון יידע מי משתמש בפורטל. נשמרים רק השם ותאריך הכניסה, ורק מנהל המועדון רואה אותם. <a href="privacy.html">מדיניות הפרטיות</a></div>
    <div class="err" id="wErr" role="alert"></div>
    <button class="btn" type="submit">כניסה לפורטל</button>
    <button class="linkbtn" type="button" id="wSkip" style="color:var(--muted)">דילוג</button>
  </form>`);
  let role="";
  $("#wRole").onclick=e=>{const b=e.target.closest("[data-r]");if(!b)return;role=b.dataset.r;$$("#wRole .chip").forEach(c=>{const on=c===b;c.setAttribute("aria-checked",on);c.style.borderColor=on?"var(--green)":"";c.style.background=on?"var(--tint)":""})};
  const done=v=>{store.set("ttc_who",JSON.stringify(v));closeSheet();try{renderMe()}catch(e){}logVisit();setTimeout(maybePopup,700)};
  $("#wSkip").onclick=()=>done({skip:1});
  $("#wForm").onsubmit=e=>{e.preventDefault();const n=$("#wName").value.replace(/[<>"]/g,"").replace(/\s+/g," ").trim();
    if(n.split(" ").filter(x=>x.length>1).length<2)return $("#wErr").textContent="נא לכתוב שם פרטי ושם משפחה";
    done({n,r:role});toast(`ברוכים הבאים, ${n.split(" ")[0]}!`)};
  setTimeout(()=>{try{$("#wName").focus({preventScroll:true})}catch(e){}},400);
}
function memberSheet(){
  const m=ME.member,isNew=!m;
  openSheet(`<h2 class="post-h">${isNew?"כמעט בפנים":"הפרטים שלי"}</h2>
  <form class="form" id="mForm" novalidate>
    <label>שם מלא<input type="text" id="mName" maxlength="80" autocomplete="name" value="${esc((m?m.name:ME.user.name)||"").slice(0,80)}" required></label>
    <label>טלפון נייד<input type="tel" id="mPhone" maxlength="20" inputmode="tel" autocomplete="tel" placeholder="050-0000000" value="${esc(m?m.phone:"")}" required></label>
    <div class="why">למה צריך: כדי לזהות אתכם כשחקנים או כהורים במועדון וליצור קשר בענייני המועדון. רק מנהל המועדון רואה את הפרטים (מי שמזמין חברים עשוי להופיע ב"גביע החברים" בשם פרטי ואות). אין חובה חוקית למסור אותם, אבל בלעדיהם אי אפשר להיכנס לאפליקציה. לא נשלח פרסומות. <a href="privacy.html">מדיניות הפרטיות</a></div>
    <label class="chk"><input type="checkbox" id="mOk" ${m?"checked":""}><span>אני בן/בת 18 ומעלה (הורה או שחקן בוגר), קראתי את <a href="privacy.html">מדיניות הפרטיות</a> ואני מסכים/ה שהפרטים יישמרו לצורך זה</span></label>
    <div class="err" id="mErr" role="alert"></div>
    <button class="btn" type="submit" id="mSave">${isNew?"שמירה":"שמירת שינויים"}</button>
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <button class="linkbtn" type="button" id="mOut" style="color:var(--muted)">התנתקות</button>
      ${m?'<button class="linkbtn" type="button" id="mDel">מחיקת הפרטים שלי</button>':""}
    </div>
  </form>`);
  $("#mForm").onsubmit=async e=>{e.preventDefault();const name=$("#mName").value.trim(),phone=$("#mPhone").value.replace(/[\s-]/g,"");
    if(!name)return $("#mErr").textContent="חסר שם.";
    if(!PHONE_OK(phone))return $("#mErr").textContent="מספר הנייד לא נראה תקין. לדוגמה 050-1234567.";
    if(!$("#mOk").checked)return $("#mErr").textContent="כדי לשמור צריך לאשר שאת/ה מעל גיל 18 ומסכים/ה לשמירת הפרטים.";
    $("#mSave").disabled=true;$("#mErr").textContent="";
    try{await TTCAuth.saveMember({name,phone,referrer:REF_LIVE&&isNew?store.get("ttc_ref"):null},isNew);ME.member={name,phone};rememberMe(ME.user,ME.member);renderMe();closeSheet();toast(isNew?"נרשמת. תודה!":"הפרטים עודכנו");if(isNew)setTimeout(maybePopup,900);track("click",isNew?"signup":"signup-edit")}
    catch(err){let saved=null;try{saved=await TTCAuth.getMember()}catch(e){}
      if(saved&&saved.phone===phone){ME.member={name:saved.name,phone};rememberMe(ME.user,ME.member);renderMe();closeSheet();toast(isNew?"נרשמת. תודה!":"הפרטים עודכנו");return}
      $("#mSave").disabled=false;$("#mErr").textContent=err&&err.code==="permission-denied"?"לא הצלחנו לשמור: השם ארוך מדי או מתחיל בסימן. תקנו ונסו שוב.":"לא הצלחנו לשמור. בדקו את החיבור ונסו שוב."}};
  $("#mOut").onclick=async()=>{await TTCAuth.signOut();rememberMe(null);closeSheet();toast("התנתקת")};
  if(m)$("#mDel").onclick=async()=>{if(!confirm("למחוק את הפרטים שלך מהמועדון? אפשר להירשם שוב בכל זמן."))return;
    try{await TTCAuth.deleteMember();ME.member=null;rememberMe(null);closeSheet();renderMe();toast("הפרטים נמחקו")}catch(e){$("#mErr").textContent="המחיקה לא הצליחה. נסו שוב."}};
}
document.addEventListener("click",async e=>{
  if(e.target.closest("#gIn")){
    if(inApp)return openSheet(`<h2 class="post-h">קודם פותחים בדפדפן</h2><div class="post-t">גוגל לא מאפשרת להתחבר מתוך פייסבוק או אינסטגרם.
1. לוחצים על שלוש הנקודות למעלה.
2. בוחרים "פתיחה בדפדפן".
3. שם לוחצים שוב על "כניסה".</div>`);
    if(!window.TTCAuth||!ME.ready)return toast("רגע, טוען…");
    SIGNING=true;const slow=setTimeout(()=>toast("אם חלון גוגל לא נפתח או נתקע, סגרו אותו ולחצו שוב על הכניסה"),45000);
    try{await TTCAuth.signIn()}catch(err){const c=err&&err.code;
      if(c==="auth/popup-blocked")toast("הדפדפן חסם את חלון הכניסה. לחצו שוב על הכניסה");
      else if(c!=="auth/popup-closed-by-user"&&c!=="auth/cancelled-popup-request")toast("ההתחברות לא הצליחה. נסו שוב.")}
    finally{clearTimeout(slow);SIGNING=false}
  }
  if(e.target.closest("#meEdit"))memberSheet();
});
// the member card is also kept on this device, so a returning member is let in even when offline or on a weak line
function rememberMe(u,m){store.set("ttc_me",u&&m?JSON.stringify({uid:u.uid,name:m.name,phone:m.phone}):null)}
async function loadMember(u){
  for(let i=0;i<2;i++){try{const m=await Promise.race([TTCAuth.getMember(),new Promise((_,no)=>setTimeout(()=>no(new Error("slow")),8000))]);rememberMe(u,m);return{member:m}}catch(e){}}
  let c=null;try{c=JSON.parse(store.get("ttc_me")||"null")}catch(e){}
  if(c&&c.uid===u.uid)return{member:{name:c.name,phone:c.phone},unsure:true};
  return{member:store.get("ttc_m")?{name:u.name||"",phone:""}:null,unsure:true}}
function startAuth(){
  addEventListener("ttc-auth-ready",()=>TTCAuth.onUser(async u=>{u=null;ME.user=u;ME.member=null;
    // sign in once: a weak line or a slow answer must never look like "not registered"
    if(u){const r=await loadMember(u);ME.member=r.member;if(r.unsure)setTimeout(()=>loadMember(u).then(x=>{if(!x.unsure&&ME.user===u){ME.member=x.member;renderMe()}}),15000)}
    else rememberMe(null);
    ME.ready=true;renderMe()}),{once:true});
  const sc=document.createElement("script");sc.src="auth.js?v="+(BUILD||"1");sc.defer=true;document.head.appendChild(sc);
}
const SIGNIN_ON=true;
if(SIGNIN_ON){introDone.then(()=>setTimeout(startAuth,300));addEventListener("load",()=>{try{renderMe()}catch(e){}})} // card shows at once; fills in when sign-in state is known

/* ---------- event popup: after a member finished joining, an active event post pops up once with one-tap registration ---------- */
const SHIRTS=["XS","S","M","L","XL","XXL","ילדים 6","ילדים 8","ילדים 10","ילדים 12","ילדים 14"];
const BIRTH_OK=v=>/^\d{1,2}[./]\d{1,2}[./]\d{4}$/.test(v);
// birth date as three pickers (day / month / year): nothing to type, no format to get wrong
const MONTHS=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
function bdSel(v){const m=String(v||"").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)||[],Y=new Date().getFullYear(),o=(cls,lab,ph,list,cur)=>`<select class="${cls}" aria-label="${lab}"><option value="">${ph}</option>${list.map(([val,t])=>`<option value="${val}"${String(val)===String(cur)?" selected":""}>${t}</option>`).join("")}</select>`;
  return o("f-bd","יום","יום",Array.from({length:31},(_,i)=>[i+1,i+1]),m[1]&&+m[1])+o("f-bm","חודש","חודש",MONTHS.map((n,i)=>[i+1,n]),m[2]&&+m[2])+o("f-by","שנה","שנה",Array.from({length:Y-1919},(_,i)=>[Y-i,Y-i]),m[3])}
function birthOf(r){const d=r.querySelector(".f-bd").value,m=r.querySelector(".f-bm").value,y=r.querySelector(".f-by").value;
  if(!d||!m||!y)return"";const t=new Date(+y,+m-1,+d);return t.getMonth()===+m-1?`${d}.${m}.${y}`:"bad"}
function activeEvent(){const today=new Date().toISOString().slice(0,10);
  return (POSTS||[]).find(p=>p&&!p.hidden&&p.popup&&/^[a-z0-9-]{3,40}$/.test(p.popup.event||"")&&(!p.popup.until||p.popup.until>=today))}
function personRow(i,p,heats){const opt=(arr,v)=>arr.map(x=>`<option${x===v?" selected":""}>${esc(x)}</option>`).join("");
  return `<fieldset class="pp-row" data-i="${i}"><legend>${i===0?"אני":"משתתף/ת "+(i+1)}${i>0?' <button type="button" class="linkbtn pp-del" aria-label="הסרה">הסרה</button>':""}</legend>
  <div class="two"><label>שם פרטי<input type="text" class="f-first" maxlength="40" value="${esc((p.firstName||"").slice(0,40))}"></label><label>שם משפחה<input type="text" class="f-last" maxlength="40" value="${esc((p.lastName||"").slice(0,40))}"></label></div>
  <div class="two"><label>מקצה<select class="f-heat">${opt(heats,p.heat||heats[0])}</select></label><label>מגדר<select class="f-gender"><option value="ז"${p.gender==="ז"?" selected":""}>זכר</option><option value="נ"${p.gender==="נ"?" selected":""}>נקבה</option></select></label></div>
  <label>תאריך לידה<div class="bd">${bdSel(p.birth)}</div></label>
  <label>מידת חולצה<select class="f-shirt">${opt(SHIRTS,p.shirt||"M")}</select></label></fieldset>`}
async function eventSheet(post,force,fromPop){
  const ev=post.popup,hs=(Array.isArray(ev.heats)?ev.heats:[]).filter(x=>typeof x==="string"&&x&&x.length<=20).slice(0,6),heats=hs.length?hs:["4 ק״מ"];
  let mine=[];try{mine=await Promise.race([TTCAuth.mySignups(ev.event),new Promise((_,no)=>setTimeout(()=>no(0),5000))])}catch(e){}
  const img=IMG_OK.test(post.img||"")?post.img:"";
  // organiser's own sign-up file (same link as the poster's QR), offered next to the in-app form
  const ext=/^https:\/\/docs\.google\.com\//.test(post.link||"")?`<a class="btn ghost" style="margin-top:10px" href="${esc(post.link)}" target="_blank" rel="noopener">${esc(post.linkText||"לקובץ ההרשמה של המארגנים")}</a>`:"";
  if(mine.length){if(!force)return;openSheet(`${img?`<img class="post-img" src="${img}" alt="">`:""}<h2 class="post-h">${esc(post.title)}</h2><div class="post-t">אתם רשומים ✅\n${mine.map(m=>`${esc(m.firstName)} ${esc(m.lastName)} · ${esc(m.heat)}`).join("\n")}</div>${ext}<button class="linkbtn" id="evCancel" type="button">ביטול ההרשמה</button>`);
    $("#evCancel").onclick=async()=>{if(!confirm("לבטל את ההרשמה של כל המשתתפים?"))return;try{await TTCAuth.cancelSignups(ev.event);closeSheet();toast("ההרשמה בוטלה")}catch(e){toast("הביטול לא הצליח")}};return}
  const nm=(ME.member.name||"").trim().split(/\s+/),me={firstName:nm[0]||"",lastName:nm.slice(1).join(" ")};
  openSheet(`${img&&!fromPop?`<img class="post-img" src="${img}" alt="">`:""}<h2 class="post-h">${fromPop?"הרשמה · ":""}${esc(post.title)}</h2>${post.text&&!fromPop?`<div class="post-t">${esc(post.text)}</div>`:""}
  <form class="form" id="evForm" novalidate>
    <div id="ppRows">${personRow(0,me,heats)}</div>
    <button type="button" class="btn ghost" id="ppAdd">+ הוספת בן/בת משפחה</button>
    <label>עיר / יישוב<input type="text" id="evCity" maxlength="40" autocomplete="address-level2"></label>
    <div class="why">הפרטים נשלחים למנהל המועדון לצורך ההרשמה לאירוע. אין צורך בתעודת זהות כאן — אם המארגנים יבקשו, ניצור קשר. הטלפון והמייל נלקחים מהאזור האישי.</div>
    <div class="err" id="evErr" role="alert"></div>
    <button class="btn" type="submit" id="evSave">להרשמה</button>${ext}
    <button class="linkbtn" type="button" id="evLater" style="color:var(--muted)">לא עכשיו</button>
  </form>`);
  const rows=$("#ppRows");
  $("#ppAdd").onclick=()=>{const n=rows.children.length;if(n>=8)return;rows.insertAdjacentHTML("beforeend",personRow(n,{lastName:me.lastName},heats))};
  rows.addEventListener("click",e=>{const d=e.target.closest(".pp-del");if(d)d.closest(".pp-row").remove()});
  $("#evLater").onclick=()=>{store.set("ttc_pop_"+ev.event,String(Date.now()));closeSheet()};
  $("#evForm").onsubmit=async e=>{e.preventDefault();const err=$("#evErr");err.textContent="";
    const city=$("#evCity").value.trim();
    const people=[...rows.querySelectorAll(".pp-row")].map(r=>({firstName:r.querySelector(".f-first").value.trim(),lastName:r.querySelector(".f-last").value.trim(),heat:r.querySelector(".f-heat").value,gender:r.querySelector(".f-gender").value,birth:birthOf(r),shirt:r.querySelector(".f-shirt").value,city,phone:ME.member.phone}));
    const bad=people.findIndex(p=>!p.firstName||!p.lastName||!BIRTH_OK(p.birth));
    if(bad>=0){const p=people[bad],who=bad===0?"המשתתף הראשון":"משתתף "+(bad+1);return err.textContent=!p.firstName||!p.lastName?`חסר שם פרטי או שם משפחה אצל ${who}.`:p.birth==="bad"?`התאריך שנבחר לא קיים (למשל 31 בפברואר) אצל ${who}.`:`צריך לבחור יום, חודש ושנת לידה אצל ${who}.`}
    if(!city)return err.textContent="חסרה עיר / יישוב.";
    $("#evSave").disabled=true;
    try{await TTCAuth.signUp(ev.event,people,ME.member.name);closeSheet();toast("נרשמתם! 🎉");track("click","event:"+ev.event)}
    catch(x){let done=[];try{done=await TTCAuth.mySignups(ev.event)}catch(e){}
      if(done.length){closeSheet();toast("נרשמתם! 🎉");return}
      $("#evSave").disabled=false;err.textContent=x&&x.code==="permission-denied"?"ההרשמה לא נשמרה: אחד הפרטים לא תקין (שם שמתחיל בסימן, טלפון או תאריך). בדקו ונסו שוב, או כתבו לנו בוואטסאפ 050-4999149.":"ההרשמה לא נשמרה. בדקו את החיבור לאינטרנט ונסו שוב."}};
}
let popReturn=null;
let popAction=null,popLaterFn=null;
function showPop(post,opts={}){const img=opts.img||(IMG_OK.test(post.img||"")?post.img:"");$("#popGo").textContent=opts.go||"להרשמה";popAction=opts.action||null;popLaterFn=opts.later||null;
  $("#popImg").hidden=!img;if(img)$("#popImg").src=img;$("#popT").textContent=post.title||"";$("#popTx").textContent=post.text||"";
  popReturn=document.activeElement;const el=$("#pop");el.hidden=false;el.classList.add("on");requestAnimationFrame(()=>$("#popCard").focus({preventScroll:true}));track("post","popup:"+(post.popup?post.popup.event:"invite"))}
function hidePop(){const el=$("#pop");el.hidden=true;el.classList.remove("on");popReturn&&popReturn.focus&&popReturn.focus({preventScroll:true})}
async function maybePopup(){const p=activeEvent();if(!p||!$("#pop").hidden)return;
  if(store.get("ttc_pop_"+p.popup.event))return; // closed once (X, "not now" or registration): never again on this device
  if(sheet.hidden)showPop(p)}
let popAway=0;document.addEventListener("visibilitychange",()=>{if(document.hidden)popAway=Date.now();else if(popAway&&Date.now()-popAway>60e3)maybePopup()}); // an installed app resumes instead of reloading
$("#popGo").onclick=()=>{hidePop();if(popAction)return popAction();const p=activeEvent();if(p)store.set("ttc_pop_"+p.popup.event,String(Date.now()));openEvent()};
$("#popLater").onclick=$("#popX").onclick=()=>{if(popLaterFn){popLaterFn();return hidePop()}const p=activeEvent();if(p)store.set("ttc_pop_"+p.popup.event,String(Date.now()));hidePop()};
$("#pop").addEventListener("click",e=>{if(e.target.id==="pop")$("#popLater").click()});
addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#pop").hidden)$("#popLater").click()});
function openEvent(){const p=activeEvent();if(!p)return;
  if(/^https:\/\//.test(p.link||""))return open(p.link,"_blank","noopener");toast("לפרטים והרשמה: 050-4999149")}

/* ---------- scroll craft: each screen's scroll drives one picture (hero layers + served ball, club wipe, competitions zoom) ---------- */
(()=>{const clamp=v=>v>0?Math.min(1,v):0,sh=$("#sh"),ball=sh&&sh.querySelector(".sh-ball");
  const bind=(screen,el,fn)=>{if(!screen||!el)return;let q=0;const run=()=>{q=0;fn()};screen.addEventListener("scroll",()=>{if(!q)q=requestAnimationFrame(run)},{passive:true});addEventListener("resize",run);run()};
  // the serve: from the near half of the real table, over the net, to the far half — tied to how far you scrolled
  const serve=p=>{if(!ball)return;const x=72-40*p,y=70-18*p-Math.sin(p*Math.PI)*16,k=1-.45*p;ball.style.transform=`translate(${x/2.1*100}%,${y/2.1*100*.75}%) scale(${k})`};
  bind($("#s-home"),sh,()=>{if(RM.matches)return serve(0);const p=clamp($("#s-home").scrollTop/((sh.offsetHeight||1)*.85));sh.style.setProperty("--p",p.toFixed(4));serve(p)});
  const chap=$("#chap");if(chap){if(RM.matches||!("IntersectionObserver" in window))chap.classList.add("open");else new IntersectionObserver((es,o)=>{if(es.some(e=>e.isIntersecting)){chap.classList.add("open");o.disconnect()}},{threshold:.35}).observe(chap)}
  const z=$("#zoomer");bind($("#s-comp"),z,()=>{const s=$("#s-comp").scrollTop;z.style.setProperty("--z",RM.matches?1:clamp(s/((z.offsetHeight||1)*.7)).toFixed(4))});
  if(sh)introDone.then(()=>{if(!RM.matches)sh.classList.add("enter");setTimeout(()=>sh.classList.add("ready"),RM.matches?0:900)});
})();

/* ---------- push notifications: asked only on tap; on iPhone only inside the installed app (Apple's rule) ---------- */
const VAPID="BGx07AqVN8ALvNMYIuAvwyvNE92-8eE8hhwU6KQ7jCqh8cAwPZk35SY3GhhFt1IQxFaOuEkQDYcTi_EcxTzlVNU"; // public Web Push key (Firebase Cloud Messaging)
const PUSH_LIVE=true;
const pushOk=()=>PUSH_LIVE&&VAPID&&"Notification" in window&&"serviceWorker" in navigator&&"PushManager" in window&&(!isIOS||standalone);
const pushAsk=()=>pushOk()&&Notification.permission==="default"&&!store.get("ttc_push_no");
document.addEventListener("click",e=>{if(e.target.closest("#pushOn"))pushOnClick()});
async function pushOnClick(){
  const perm=await Notification.requestPermission(); // must be the first await, inside the tap
  if(perm!=="granted"){store.set("ttc_push_no","1");renderMe();return toast("אפשר להפעיל אחר כך מהגדרות הדפדפן")}
  $("#pushOn").disabled=true;
  const wait=()=>window.TTCAuth?Promise.resolve():new Promise(r=>addEventListener("ttc-auth-ready",r,{once:true}));
  try{await wait();await TTCAuth.enablePush(VAPID,isIOS?"ios":DEV==="mobile"?"android":"desktop");renderMe();toast("ההתראות הופעלו 🔔");track("click","push-on")}
  catch(e){$("#pushOn").disabled=false;toast("לא הצלחנו להפעיל התראות במכשיר הזה")}};

/* ---------- bring a friend: members share a personal link; the friend lands on a welcome popup with one tap to book a free trial ---------- */
const BOARD_URL="https://shahar1987.github.io/ttc-club-board/";
const REF_LIVE=false; // no sign-in on the portal, so no personal invite links or trophy table
async function loadTrophy(){if(!REF_LIVE||!window.TTCAuth)return;let r=null;try{r=await TTCAuth.referrals()}catch(e){}
  const top=r&&Array.isArray(r.top)?r.top.filter(x=>x&&typeof x.name==="string"&&Number.isFinite(+x.count)).slice(0,10):[];
  if(!top.length)return;const medal=["🥇","🥈","🥉"];
  $("#trophy").innerHTML=top.map((x,i)=>`<div class="lrow" style="cursor:default"><span class="rk">${medal[i]||i+1}</span><span class="nm"><b>${esc(x.name)}</b><span>${+x.count===1?"הביא/ה חבר אחד":"הביא/ה "+(+x.count)+" חברים"}</span></span><span></span></div>`).join("");
  $("#trophySec").hidden=false}
addEventListener("ttc-auth-ready",loadTrophy,{once:true});
const cleanName=v=>String(v||"").replace(/[^\p{L}\s'׳"-]/gu,"").replace(/\s+/g," ").trim().slice(0,20);
document.addEventListener("click",async e=>{if(!e.target.closest("#invite"))return;
  const first=cleanName((ME.member&&ME.member.name||"").split(" ")[0]);
  const url=BOARD_URL+"?from="+encodeURIComponent(first)+(REF_LIVE&&ME.user?"&ref="+encodeURIComponent(ME.user.uid):"");
  const text=`היי! אני מתאמן/ת במועדון טניס השולחן מבואות החרמון ובא לי שתבוא/י לנסות 🏓 אימון ניסיון ראשון בחינם, לכל הגילים. כל הפרטים כאן:`;
  track("click","invite-share");
  if(navigator.share){try{await navigator.share({title:"מועדון טניס שולחן מבואות החרמון",text,url});return}catch(err){if(err&&err.name==="AbortError")return}}
  open("https://wa.me/?text="+encodeURIComponent(text+"\n"+url),"_blank","noopener")});
(()=>{const q=new URLSearchParams(location.search),from=cleanName(q.get("from")),rf=q.get("ref")||"";if(/^[A-Za-z0-9]{10,128}$/.test(rf)&&!store.get("ttc_ref"))store.set("ttc_ref",rf);if(!from)return;
  try{history.replaceState(null,"",location.pathname+location.hash)}catch(e){}
  if(store.get("ttc_invited"))return;track("view","invite");
  introDone.then(()=>setTimeout(()=>{if(!$("#pop").hidden||ME.member)return;
    showPop({title:`${from} מזמין/ה אותך למועדון 🏓`,text:"אימון ניסיון ראשון בחינם, לכל הגילים ובכל מועד.\nכותבים לנו ונתאם יחד מתי מתאים לך."},{img:"logo.png",go:"לתיאום אימון ניסיון",
      action:()=>{store.set("ttc_invited","1");track("click","invite-book");open("https://wa.me/972504999149?text="+encodeURIComponent(`היי, הגעתי דרך ${from} ואשמח לתאם אימון ניסיון 🏓`),"_blank","noopener")},
      later:()=>store.set("ttc_invited","1")})},900))})();

/* ---------- pull to refresh on home ---------- */
(()=>{const home=$("#s-home"),ball=$("#ptr");let y0=null,dy=0,busy=false;
  home.addEventListener("touchstart",e=>{if(busy||home.scrollTop>0)return;y0=e.touches[0].clientY;dy=0},{passive:true});
  home.addEventListener("touchmove",e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);if(home.scrollTop>0){y0=null;return}
    const k=Math.min(1,dy/90);ball.style.opacity=k;ball.style.transform=`translateY(${-30+dy*.6}px) rotate(${dy*3}deg)`},{passive:true});
  home.addEventListener("touchend",async()=>{if(y0===null)return;y0=null;
    if(dy<90){ball.style.opacity=0;ball.style.transform="";return}
    busy=true;ball.style.transform="";ball.classList.add("spin");haptic();
    try{const[d,p,sp]=await Promise.all([tfetch("data.json",{cache:"no-store"},12000).then(r=>r.json()),tfetch("posts.json",{cache:"no-store"},5000).then(r=>r.ok?r.json():{}).catch(()=>({})),staffPosts()]);
      D=cleanData(d);POSTS=(Array.isArray(p.posts)?p.posts:[]).concat(sp);
      for(const f of [renderHome,renderPosts,()=>renderLeague(0),renderRank,renderClub])try{f()}catch(e){}
      toast("עודכן ✓")}catch(e){toast("אין חיבור כרגע")}
    await new Promise(r=>setTimeout(r,500));ball.classList.remove("spin");ball.style.opacity=0;busy=false});
})();
