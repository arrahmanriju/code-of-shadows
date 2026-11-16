// Read-only deployment checks. Secret findings print filenames, never values.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const root=process.cwd();
let failed=false;
function check(ok,label) {console.log(`${ok?'PASS':'FAIL'}: ${label}`);if(!ok)failed=true;}
function exactPath(path) {
  let dir=root;
  for(const part of relative(root,path).split(/[\\/]/)) {
    if(!existsSync(dir) || !readdirSync(dir).includes(part)) return false;
    dir=resolve(dir,part);
  }
  return true;
}
for(const file of ['public/bat-logo.svg','public/resume.pdf','public/audio/background.mp3']) check(exactPath(resolve(root,file)),`Asset exists with exact case: ${file}`);
const svg=readFileSync('public/bat-logo.svg','utf8');
check(/<svg\b/.test(svg) && /<path\b/.test(svg),'Logo is SVG artwork');
check(readFileSync('public/resume.pdf').subarray(0,5).toString()==='%PDF-','Résumé has PDF signature');
const audio=readFileSync('public/audio/background.mp3');
check(audio.subarray(0,3).toString()==='ID3' || (audio[0]===255 && (audio[1]&224)===224),'Music has MP3 signature');
const skip=new Set(['node_modules','.next','.git','.vercel','.aws','.agents','.codex','coverage']);
function walk(dir) {return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>skip.has(entry.name)?[]:entry.isDirectory()?walk(resolve(dir,entry.name)):[resolve(dir,entry.name)]);}
const files=walk(root);
const uploadable=files.filter(file=>!relative(root,file).startsWith('.env') || relative(root,file)==='.env.example');
for(const file of uploadable.filter(f=>/\.(?:[cm]?[jt]sx?|json|md|css|html|example)$/.test(f))) {
  const text=readFileSync(file,'utf8');
  const key=process.env.GEMINI_API_KEY;
  check(!/AIza[\w-]{35}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}/.test(text) && !(key && key.length>10 && text.includes(key)),`No recognizable credential literal: ${relative(root,file)}`);
  if(!/\.[jt]sx?$/.test(file))continue;
  for(const {fileName} of ts.preProcessFile(text).importedFiles) {
    if(!fileName.startsWith('.') && !fileName.startsWith('@/'))continue;
    const base=fileName.startsWith('@/')?resolve(root,fileName.slice(2)):resolve(dirname(file),fileName);
    const candidates=[base,...['.ts','.tsx','.js','.mjs','.json','.css','/index.ts','/index.tsx'].map(ext=>base+ext)];
    check(candidates.some(exactPath),`Import case: ${relative(root,file)} → ${fileName}`);
  }
}
const template=readFileSync('.env.example','utf8');
check(/^GEMINI_API_KEY=\s*$/m.test(template),'Environment template has no API key value');
check(!uploadable.filter(f=>f.includes(`${String.fromCharCode(92)}components${String.fromCharCode(92)}`) || /\/components\//.test(f)).some(f=>/GEMINI_API_KEY|NEXT_PUBLIC_\w*(?:KEY|SECRET)/.test(readFileSync(f,'utf8'))),'Client components contain no Gemini key references');
try {
  const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean);
  check(!tracked.some(f=>/^(?:\.env(?!\.example$)|node_modules\/|\.next\/|\.vercel\/|\.aws\/)/.test(f)),'Git tracks no environment files, dependencies, or build output');
} catch { console.log('LIMIT: No Git repository; tracked files and commit history cannot be audited.'); }
if(process.argv.includes('--build')) {
  const tracePath='.next/server/app/favicon.svg/route.js.nft.json';
  const trace=JSON.parse(readFileSync(tracePath,'utf8'));
  check(trace.files.some(file=>file.replace(/\\/g,'/').endsWith('/public/bat-logo.svg')),'Server favicon trace includes the SVG required at runtime');
  const chunks=walk(resolve(root,'.next/static')).filter(f=>/\.(?:js|html|json)$/.test(f));
  const key=process.env.GEMINI_API_KEY;
  check(!chunks.some(file=>{const text=readFileSync(file,'utf8');return /AIza[\w-]{35}/.test(text) || !!(key && key.length>10 && text.includes(key));}),'Browser build contains no recognizable Gemini API key literals');
}
if(failed)process.exitCode=1;
