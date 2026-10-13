const SUPA_URL='https://zcmzpkdgxteouditmmud.supabase.co';
const SUPA_KEY='sb_publishable__WGct3XmHpVBY1B4X2PdXg_KpJ74Nlp';
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);
let me=null, cur=null;

setTimeout(()=>document.getElementById('splash')?.classList.add('hide'),1200);

async function realLogin(){
 try{
  let name=document.getElementById('loginName').value.trim();
  let phone=document.getElementById('loginPhone').value.trim();
  let pass=document.getElementById('loginPass').value.trim();
  if(!name||!phone||!pass) return alert('Remplis nom + phone + pass');
  document.getElementById('status').textContent='Connexion...';
  document.getElementById('err').textContent='';
  let {data,error}=await supa.from('users').select('*').eq('phone',phone).maybeSingle();
  if(error) throw error;
  if(!data){
   let {data:newU,[STRIPPED] supa.from('users').insert({full_name:name,phone:phone,password:pass}).select().single();
   if(insErr) throw insErr; data=newU;
  }
  me=data; localStorage.setItem('meiho-me',JSON.stringify(me));
  document.getElementById('pAuth').classList.remove('active');
  document.getElementById('pChats').classList.add('active');
  loadChats();
 }catch(e){document.getElementById('err').textContent=e.message}
}
async function loadChats(){
 let {data,error}=await supa.from('users').select('*').neq('phone',me.phone);
 if(error){document.getElementById('err').textContent=error.message; return}
 let html=''; (data||[]).forEach(p=>{
  html+=`<div class="row" onclick="openReal('${p.phone}','${p.full_name}')"><div class="ava">${p.full_name[0].toUpperCase()}</div><div><b>${p.full_name}</b><div style="color:#8696a0;font-size:13px">${p.phone}</div></div></div>`;
 });
 document.getElementById('chatList').innerHTML=html||'<div style="padding:20px;text-align:center;color:#8696a0">Aucun autre utilisateur</div>';
}
async function openReal(ph,na){cur=ph; document.getElementById('chat').classList.add('open'); document.getElementById('chatName').textContent=na; loadMsgs();}
async function loadMsgs(){
 if(!cur) return;
 let {data}=await supa.from('messages').select('*').or(`and(sender_phone.eq.${me.phone},receiver_phone.eq.${cur}),and(sender_phone.eq.${cur},receiver_phone.eq.${me.phone})`).order('id',{ascending:true});
 let box=document.getElementById('msgs'); box.innerHTML='';
 (data||[]).forEach(m=>{
  let d=document.createElement('div'); d.className='bubble '+(m.sender_phone===me.phone?'me':'other'); d.textContent=m.content; box.appendChild(d);
 });
 box.scrollTop=box.scrollHeight;
}
async function sendReal(){
 let t=document.getElementById('inp').value.trim(); if(!t||!cur) return;
 await supa.from('messages').insert({sender_phone:me.phone,receiver_phone:cur,content:t});
 document.getElementById('inp').value=''; loadMsgs();
}
function closeChat(){document.getElementById('chat').classList.remove('open')}
let saved=localStorage.getItem('meiho-me');
if(saved){me=JSON.parse(saved); document.getElementById('pAuth').classList.remove('active'); document.getElementById('pChats').classList.add('active'); loadChats();}
