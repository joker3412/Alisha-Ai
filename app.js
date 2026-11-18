(()=>{
'use strict';
const $=id=>document.getElementById(id);
const STORAGE='alisha_pink_chats_v1';
let chats=[],activeId=null,busy=false,voiceEnabled=true,speaking=false;
try { const parsed=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(parsed))chats=parsed.filter(x=>x&&typeof x.id==='string'&&Array.isArray(x.messages)).slice(0,70);}catch{}
try {voiceEnabled=localStorage.getItem('alisha_voice')!=='false';}catch{}
$('voiceCheckbox').checked=voiceEnabled;
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(chats.slice(0,70)));}catch{}}
function current(){return chats.find(x=>x.id===activeId)}
function resetSpeech(){if('speechSynthesis'in window)window.speechSynthesis.cancel();speaking=false;$('panda').classList.remove('talk');}
function setPanda(caption,action='wave'){
 const panda=$('panda'),stage=$('pandaStage');$('pandaCaption').textContent=caption;
 panda.classList.remove('wave','hide');stage.classList.remove('hiding');void panda.offsetWidth;
 if(action==='hide'){panda.classList.add('hide');stage.classList.add('hiding');setTimeout(()=>{panda.classList.remove('hide');stage.classList.remove('hiding');$('pandaCaption').textContent='Here I am! ♡'},2000);}else{panda.classList.add('wave');setTimeout(()=>panda.classList.remove('wave'),2600);}
}
$('pandaStage').addEventListener('click',()=>setPanda('Peekaboo! You found me! 🐼','hide'));
function say(text){
 if(!('speechSynthesis'in window)){alert('Voice playback is unavailable in this browser.');return;}
 resetSpeech();let utterance=new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g,'code example').replace(/[*#`_]/g,''));utterance.rate=1.03;utterance.pitch=1.16;utterance.lang='en-US';
 const voices=window.speechSynthesis.getVoices();const preferred=voices.find(v=>v.lang.startsWith('en') && /female|zira|samantha|google us english/i.test(v.name));if(preferred)utterance.voice=preferred;
 utterance.onstart=()=>{speaking=true;$('panda').classList.add('talk');$('pandaCaption').textContent='ALISHA is speaking ♡';};
 utterance.onend=utterance.onerror=()=>{speaking=false;$('panda').classList.remove('talk');$('pandaCaption').textContent='All ears, always. ♡';};
 window.speechSynthesis.speak(utterance);
}
function makeChat(){resetSpeech();activeId=null;$('messages').replaceChildren();$('welcome').classList.remove('hidden');$('prompt').value='';renderHistory();$('prompt').focus();closeNav();}
function renderHistory(){
 const el=$('chatList');el.replaceChildren();$('chatCount').textContent=String(chats.length);
 if(!chats.length){const p=document.createElement('p');p.className='emptyHistory';p.textContent='A fresh start, just for you. ♡';el.append(p);return;}
 for(const chat of chats){const btn=document.createElement('button');btn.className='historyItem'+(chat.id===activeId?' active':'');const icon=document.createElement('span');icon.textContent='◫';const title=document.createElement('span');title.className='histTitle';title.textContent=chat.title||'New conversation';const del=document.createElement('button');del.className='deleteChat';del.textContent='×';del.title='Delete conversation';del.setAttribute('aria-label','Delete conversation');del.addEventListener('click',e=>{e.stopPropagation();chats=chats.filter(x=>x.id!==chat.id);persist();if(activeId===chat.id)makeChat();else renderHistory();});btn.append(icon,title,del);btn.addEventListener('click',()=>openChat(chat.id));el.append(btn);}
}
function openChat(id){resetSpeech();activeId=id;$('welcome').classList.add('hidden');renderMessages();renderHistory();closeNav();}
function addMessage(role,content,pending=false){
 const line=document.createElement('div');line.className='message '+role;if(role==='assistant'){const icon=document.createElement('span');icon.className='assistantIcon';icon.textContent='∞';line.append(icon);}
 const column=document.createElement('div');const bubble=document.createElement('div');bubble.className='bubble';if(pending){bubble.classList.add('typing');for(let i=0;i<3;i++)bubble.append(document.createElement('span'));}else bubble.textContent=content;column.append(bubble);
 if(role==='assistant'&&!pending){const foot=document.createElement('div');foot.className='messageFoot';const copy=document.createElement('button');copy.textContent='⧉ Copy';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(content);copy.textContent='✓ Copied';}catch{copy.textContent='Copy unavailable';}});const speak=document.createElement('button');speak.textContent='🔊 Read aloud';speak.addEventListener('click',()=>say(content));foot.append(copy,speak);column.append(foot);}
 line.append(column);$('messages').append(line);$('chatArea').scrollTop=$('chatArea').scrollHeight;return line;
}
function renderMessages(){$('messages').replaceChildren();const chat=current();if(chat)for(const msg of chat.messages)addMessage(msg.role,msg.content);}
async function submitPrompt(text){
 text=text.trim();if(!text||busy)return;
 if(!current()){const chat={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),title:text.slice(0,48),messages:[],created:Date.now()};chats.unshift(chat);activeId=chat.id;}
 const chat=current();chat.messages.push({role:'user',content:text});persist();renderHistory();$('welcome').classList.add('hidden');addMessage('user',text);$('prompt').value='';resize();
 busy=true;$('sendBtn').disabled=true;const pending=addMessage('assistant','',true);setPanda('Thinking of something lovely...');
 try{
  const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:chat.messages.slice(-24)})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Something went wrong.');
  const reply=data.reply;if(typeof reply!=='string')throw new Error('No reply returned.');
setPanda('Another little mystery solved! ✨');

  chat.messages.push({role:'assistant',content:reply});persist();pending.remove();if(activeId===chat.id)addMessage('assistant',reply);
 }catch(error){pending.remove();if(activeId===chat.id)addMessage('assistant','Sorry, I couldn’t answer just now. '+error.message);setPanda('Oops! Try again? ♡');}
 finally{busy=false;$('sendBtn').disabled=false;$('prompt').focus();}
}
function resize(){$('prompt').style.height='auto';$('prompt').style.height=Math.min($('prompt').scrollHeight,160)+'px';}
$('chatForm').addEventListener('submit',e=>{e.preventDefault();submitPrompt($('prompt').value);});
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('chatForm').requestSubmit();}});
$('prompt').addEventListener('input',resize);
$('newChat').addEventListener('click',makeChat);$('workspaceBtn').addEventListener('click',makeChat);
document.querySelectorAll('.suggestion').forEach(x=>x.addEventListener('click',()=>submitPrompt(x.dataset.prompt)));
function closeNav(){$('sidebar').classList.remove('open');}
$('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
function showSettings(){updateStatus();$('settingsModal').classList.remove('hidden');closeNav();}
function hideSettings(){$('settingsModal').classList.add('hidden');}
$('settingsBtn').addEventListener('click',showSettings);$('connectionBtn').addEventListener('click',showSettings);$('closeSettings').addEventListener('click',hideSettings);
$('settingsModal').addEventListener('click',e=>{if(e.target===$('settingsModal'))hideSettings();});
$('voiceCheckbox').addEventListener('change',e=>{voiceEnabled=e.target.checked;try{localStorage.setItem('alisha_voice',String(voiceEnabled));}catch{}if(!voiceEnabled)resetSpeech();syncVoice();});
function syncVoice(){$('speakToggle').textContent=voiceEnabled?'🔊 Voice on':'🔇 Voice off';}
$('speakToggle').addEventListener('click',()=>{$('voiceCheckbox').checked=!voiceEnabled;$('voiceCheckbox').dispatchEvent(new Event('change'));});
$('clearChats').addEventListener('click',()=>{if(confirm('Delete all conversations stored on this device?')){chats=[];persist();makeChat();hideSettings();}});
async function updateStatus(){try{const r=await fetch('/api/status');const d=await r.json();$('statusDot').classList.toggle('online',d.connected);$('statusText').textContent=d.connected?'ALISHA ready':'Connect AI';$('settingsConnection').textContent=d.connected?'Connected ('+d.provider+')':'Not configured';}catch{$('statusText').textContent='Offline';$('settingsConnection').textContent='Server unavailable';}}
$('micBtn').addEventListener('click',()=>{const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition){alert('Dictation needs a supported browser such as Chrome, with microphone permission.');return;}const recognition=new SpeechRecognition();recognition.lang=navigator.language||'en-US';recognition.interimResults=false;recognition.onresult=e=>{$('prompt').value+=(($('prompt').value?' ':'')+e.results[0][0].transcript);resize();};recognition.onerror=e=>alert('Microphone error: '+e.error);recognition.start();});
window.addEventListener('beforeunload',resetSpeech);
syncVoice();renderHistory();updateStatus();
})();
