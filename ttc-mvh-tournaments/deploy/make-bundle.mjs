// בונה חבילה מוצפנת של קבצי האתר לפריסה ב-Render.
// שימוש: node deploy/make-bundle.mjs OUT_FILE  → מדפיס JSON עם key ו-version (לא לשמור בשום מקום)
import {readFileSync,writeFileSync} from 'node:fs';
import {webcrypto as c} from 'node:crypto';
import {execSync} from 'node:child_process';
const root=new URL('..',import.meta.url).pathname;
const FILES={'index.html':'text/html; charset=utf-8','sw.js':'text/javascript; charset=utf-8','manifest.json':'application/manifest+json','icon.svg':'image/svg+xml','icon-180.png':'image/png','icon-192.png':'image/png','icon-512.png':'image/png'};
const version=execSync('git rev-parse --short HEAD',{cwd:root}).toString().trim()+'-'+Date.now().toString(36);
const files={};for(const [p,t] of Object.entries(FILES)){let b=readFileSync(root+p);
  // כל פריסה מקבלת גרסה חדשה, כדי שכל מכשיר פתוח (אייפד, טלפון, אייקון במסך הבית) יתרענן לבד
  if(p==='index.html'){const s=b.toString();if(!/const APP_VER='[^']+'/.test(s))throw new Error('APP_VER missing');b=Buffer.from(s.replace(/const APP_VER='[^']+'/,`const APP_VER='${version}'`))}
  files[p]={type:t,b64:b.toString('base64')}}
const plain=new TextEncoder().encode(JSON.stringify({files}));
const raw=process.env.BUNDLE_KEY?Buffer.from(process.env.BUNDLE_KEY,'base64'):c.getRandomValues(new Uint8Array(32)),iv=c.getRandomValues(new Uint8Array(12));
const key=await c.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);
const ct=new Uint8Array(await c.subtle.encrypt({name:'AES-GCM',iv},key,plain));
const out=new Uint8Array(12+ct.length);out.set(iv);out.set(ct,12);writeFileSync(process.argv[2],out);
console.log(JSON.stringify({key:Buffer.from(raw).toString('base64'),version}));
