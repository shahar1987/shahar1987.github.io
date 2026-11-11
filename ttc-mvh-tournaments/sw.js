// פתיחה מיידית גם בקליטה גרועה: הדף, ספריות Firebase והפונט נטענים מהמכשיר ומתעדכנים ברקע
const CACHE='ttls-shell-1';
const ours=u=>u.origin===location.origin;
const cacheable=u=>ours(u)||(u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/'))||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!cacheable(u))return;
  const key=ours(u)?u.origin+u.pathname:e.request; // ?view=... ו-?ts=... הם אותו דף
  const refresh=async c=>{const r=await fetch(ours(u)?new Request(u.href,{cache:'no-cache'}):e.request);if(r.ok||r.type==='opaque')await c.put(key,r.clone());return r};
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    if(ours(u)&&u.searchParams.has('ts'))return refresh(c); // בדיקת גרסה: תמיד מהרשת, והעדכון נשמר לפני הטעינה מחדש
    const hit=await c.match(key);
    if(!hit)return refresh(c);
    e.waitUntil(refresh(c).catch(()=>{}));
    return hit;
  })());
});
