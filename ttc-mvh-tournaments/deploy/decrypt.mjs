// שלב הבנייה ב-Render: מפענח את ttc.bin עם BUNDLE_KEY (משתנה סביבה פרטי) לתיקייה site/
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {webcrypto as c} from 'node:crypto';
const buf=readFileSync('ttc.bin');
const key=await c.subtle.importKey('raw',Buffer.from(process.env.BUNDLE_KEY,'base64'),'AES-GCM',false,['decrypt']);
const plain=await c.subtle.decrypt({name:'AES-GCM',iv:buf.subarray(0,12)},key,buf.subarray(12));
const {files}=JSON.parse(Buffer.from(plain).toString());
mkdirSync('site',{recursive:true});
for(const [p,f] of Object.entries(files))writeFileSync('site/'+p,Buffer.from(f.b64,'base64'));
console.log('ok',Object.keys(files).join(' '));
