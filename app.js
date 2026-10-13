// SUPABASE - M-EI HO - CLÉ OFFICIELLE CORRIGÉE
const SUPABASE_URL = "https://zcmzpkdgxteouditmmud.supabase.co";
const SUPABASE_KEY = "sb_publishable_1xpejlLbOmcq3uHNm3jiMw_LdAV8hYC";

let supabaseClient = null;
try {
  // CORRECTION ICI: window.supabase
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("✅ Supabase connecté:", SUPABASE_URL);
} catch(e) {
  console.log("❌ Erreur Supabase, mode démo", e);
}

let currentUser = null;
let currentChat = null;
let allUsers = [];

async function login(){
  const phone = document.getElementById('phone').value.trim();
  const pass = document.getElementById('password').value.trim();
  if(!phone ||!pass) return alert("Téléphone + mot de passe");

  // MODE DÉMO si Supabase pas prêt
  if(!supabaseClient){
    currentUser = {full_name: "M-EI HO BOSS", phone: phone, is_verified: true, about: "Boss du game"};
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');
    loadDemo();
    return;
  }

  try {
    const {data, error} = await supabaseClient.from('users').select('*').eq('phone', phone).eq('password', pass).single();
    if(error ||!data) return alert("Faux identifiants - Crée un compte d'abord!");
    currentUser = data;
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');
    loadUsers();
  } catch(err){
    alert("Erreur: " + err.message + "\nPasse en mode démo");
    currentUser = {full_name: "M-EI HO BOSS", phone: phone, is_verified: true, about: "Boss"};
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');
    loadDemo();
  }
}

async function register(){
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass = document.getElementById('reg-pass').value.trim();
  if(!name ||!phone ||!pass) return alert("Remplis tout BOSS!");

  if(!supabaseClient) return alert("Supabase pas connecté - attends 1 min et réessaie");

  try {
    const {data, error} = await supabaseClient.from('users').insert({
      full_name: name, phone: phone, password: pass, about: "Disponible sur M-EI HO", is_verified: false
    }).select().single();

    if(error) return alert("Erreur: " + error.message);
    alert("Compte créé! ✅ Connecte-toi maintenant");
    showLogin();
  } catch(err){
    alert("Failed to fetch? Va créer les tables dans Supabase (je t'envoie le SQL ci-dessous)");
  }
}

function showRegister(){
  document.querySelector('.login-card').classList.add('hidden');
  document.getElementById('register-card').classList.remove('hidden');
}
function showLogin(){
  document.getElementById('register-card').classList.add('hidden');
  document.querySelector('.login-card').classList.remove('hidden');
}
function loadDemo(){
  allUsers = [
    {full_name: "Aline K", phone: "+243810000001", about: "Salut j'utilise M-EI HO 🔥", is_verified: true},
    {full_name: "Glody Lub", phone: "+243810000002", about: "Boss toujours", is_verified: false},
    {full_name: "Mama Sylvie", phone: "+243810000003", about: "Disponible", is_verified: true}
  ];
  renderChats(allUsers);
}
async function loadUsers(){
  const {data} = await supabaseClient.from('users').select('*').neq('phone', currentUser.phone);
  allUsers = data || [];
  if(allUsers.length===0) loadDemo();
  else renderChats(allUsers);
}
function renderChats(users){
  const list = document.getElementById('chat-list');
  if(!list) return;
  list.innerHTML = "";
  users.forEach(u => {
    const div = document.createElement('div');
    div.className = "chat-item";
    div.onclick = () => openChat(u);
    div.innerHTML = `<div class="avatar">${u.full_name[0].toUpperCase()}</div><div class="chat-info"><div class="chat-name">${u.full_name} ${u.is_verified? '🔵':''}</div><div class="chat-last">${u.about||''}</div></div>`;
    list.appendChild(div);
  });
}
function openChat(u){
  currentChat = u;
  document.getElementById('chat-name').innerHTML = u.full_name + (u.is_verified? ' 🔵':'');
  document.getElementById('chat-status').innerText = u.about||"en ligne";
  document.getElementById('chat-avatar').innerText = u.full_name[0].toUpperCase();
  loadMessages();
}
async function loadMessages(){
  if(!currentChat) return;
  const box = document.getElementById('messages');
  if(!box) return;
  box.innerHTML = "";
  if(!supabaseClient){
    box.innerHTML = '<div class="msg received">Salut Boss! Ton app est LIVE 🔥<div class="meta">14:17</div></div><div class="msg sent">M-EI HO c\'est le futur<div class="meta">14:18 <span class="tick read">✓✓</span></div></div>';
    return;
  }
  const {data} = await supabaseClient.from('messages').select('*').or(`and(sender_phone.eq.${currentUser.phone},receiver_phone.eq.${currentChat.phone}),and(sender_phone.eq.${currentChat.phone},receiver_phone.eq.${currentUser.phone})`).order('created_at',{ascending:true});
  (data||[]).forEach(m => {
    const isMe = m.sender_phone===currentUser.phone;
    const div = document.createElement('div'); div.className = "msg "+(isMe?"sent":"received");
    div.innerHTML = `${m.content}<div class="meta">${new Date(m.created_at).toLocaleTimeString().slice(0,5)} ${isMe?'<span class="tick read">✓✓</span>':''}</div>`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}
async function sendMsg(){
  const input = document.getElementById('msg-input');
  const txt = input.value.trim();
  if(!txt||!currentChat) return;
  input.value="";
  if(!supabaseClient){
    const d=document.createElement('div'); d.className="msg sent"; d.innerHTML=`${txt}<div class="meta">14:18 <span class="tick read">✓✓</span></div>`;
    document.getElementById('messages').appendChild(d);
    return;
  }
  await supabaseClient.from('messages').insert({sender_phone:currentUser.phone,receiver_phone:currentChat.phone,content:txt,status:"read"});
  loadMessages();
}
function setTab(t){ document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); event.target.classList.add('active'); }
