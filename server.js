'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const root = __dirname;
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const name = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[name]) process.env[name] = value;
  }
}
const PORT = Number(process.env.PORT || 3000);
const PROVIDER = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
const SYSTEM = `You are ALISHA, a warm, witty, smart and dependable AI assistant inside the ALISHA app. Your name is always ALISHA, never introduce yourself by a vendor or underlying model name. Do not falsely claim to be a proprietary model or conceal factual information when directly asked about technical implementation: explain that ALISHA is an app persona powered by an external language model. Help clearly, accurately and naturally. Match the user's language. Be friendly without overdoing emojis. If you do not know, say so. Do not fabricate actions, access, or sources.`;
const LIMIT = 14000;
const buckets = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const recent = (buckets.get(ip) || []).filter(x => now - x < 60_000);
  if (recent.length >= 15) { buckets.set(ip, recent); return false; }
  recent.push(now); buckets.set(ip, recent);
  if (buckets.size > 2000) for (const [key, vals] of buckets) if (!vals.some(x => now - x < 60_000)) buckets.delete(key);
  return true;
}
function json(res, code, data) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
function serve(req,res,pathname) {
  const file = path.resolve(root, 'public', '.' + (pathname === '/' ? '/index.html' : pathname));
  const publicDir = path.join(root, 'public') + path.sep;
  if (!file.startsWith(publicDir)) return json(res,404,{error:'Not found'});
  fs.readFile(file,(err,body) => {
    if (err) return json(res,404,{error:'Not found'});
    res.writeHead(200,{'Content-Type':TYPES[path.extname(file)] || 'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=120'});
    res.end(body);
  });
}
async function chat(req,res) {
  if (!rateLimit(req.socket.remoteAddress || 'unknown')) return json(res,429,{error:'Too many requests. Please try again shortly.'});
  let bytes=0,body='';
  try {
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 90_000) return json(res,413,{error:'Conversation is too long.'});
      body += chunk.toString('utf8');
    }
    const data=JSON.parse(body);
    if (!Array.isArray(data.messages) || data.messages.length < 1 || data.messages.length > 35) return json(res,400,{error:'Invalid conversation.'});
    const messages=data.messages.map(m=>({role:m.role,content:m.content}));
    if (messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>LIMIT)) return json(res,400,{error:'Invalid message.'});
    if (messages[messages.length-1].role!=='user') return json(res,400,{error:'Last message must be from you.'});
    const key=PROVIDER==='groq'?process.env.GROQ_API_KEY:process.env.OPENROUTER_API_KEY;
    if (!key) return json(res,503,{error:`ALISHA isn't connected yet. Add ${PROVIDER==='groq'?'GROQ_API_KEY':'OPENROUTER_API_KEY'} to your .env file and restart the server.`});
    const endpoint=PROVIDER==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';
    const model=PROVIDER==='groq'?(process.env.GROQ_MODEL || 'openai/gpt-oss-20b'):(process.env.OPENROUTER_MODEL || 'openrouter/free');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),35000);
    let response;
    try {
      response=await fetch(endpoint,{
        method:'POST',signal:controller.signal,
        headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json',...(PROVIDER==='openrouter'?{'HTTP-Referer':process.env.PUBLIC_SITE_URL || 'http://localhost:3000','X-Title':'ALISHA AI'}:{})},
        body:JSON.stringify({model,messages:[{role:'system',content:SYSTEM},...messages],temperature:0.65,max_tokens:1200})
      });
    } finally {clearTimeout(timeout);}
    const result=await response.json().catch(()=>({}));
    if (!response.ok) {
      const status=response.status===429?429:502;
      return json(res,status,{error:response.status===429?'Free AI quota or rate limit reached. Please try later.':`AI provider error (${response.status}). Check your key, model, and free-tier availability.`});
    }
    const answer=result?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string'||!answer.trim()) return json(res,502,{error:'No usable response returned. Try again.'});
    return json(res,200,{reply:answer.trim()});
  } catch(error) {
    return json(res,500,{error:error?.name==='AbortError'?'ALISHA took too long to answer. Please retry.':'Could not process the message. Please retry.'});
  }
}
const server=http.createServer(async(req,res)=>{
  let pathname;
  try {pathname=new URL(req.url,'http://localhost').pathname;} catch {return json(res,400,{error:'Bad URL'});}
  if (pathname==='/api/status' && req.method==='GET') return json(res,200,{connected:!!(PROVIDER==='groq'?process.env.GROQ_API_KEY:process.env.OPENROUTER_API_KEY),provider:PROVIDER});
  if (pathname==='/api/chat' && req.method==='POST') return chat(req,res);
  if (req.method!=='GET'&&req.method!=='HEAD') return json(res,405,{error:'Method not allowed'});
  return serve(req,res,pathname);
});
server.listen(PORT,()=>console.log(`ALISHA listening at http://localhost:${PORT}`));
