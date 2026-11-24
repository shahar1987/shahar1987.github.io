// הכתובת ב-Render הועברה חזרה לכתובת המקורית של "תן לי שולחן"
import {mkdirSync,writeFileSync} from 'node:fs';
const to='https://shahar1987.github.io/ttc-mvh-tournaments/';
const html=`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>תן לי שולחן</title><meta http-equiv="refresh" content="0;url=${to}"><script>(async()=>{try{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k)}catch(e){}location.replace('${to}'+location.search)})()</script><a href="${to}">תן לי שולחן</a></html>`;
const sw=`self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.registration.unregister()})()));`;
mkdirSync('site',{recursive:true});
writeFileSync('site/index.html',html);writeFileSync('site/sw.js',sw);
console.log('redirect ->',to);
