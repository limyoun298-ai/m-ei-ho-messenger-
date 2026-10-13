// M-EI HO MESSENGER — app.js
// Authentification sécurisée avec Supabase Auth

const SUPABASE_URL = "https://zcmzpkdgxteouditmmud.supabase.co";
const SUPABASE_KEY = "sb_publishable_1xpejlLbOmcq3uHNm3jiMw_LdAV8hYC";

let db = null;
let currentUser = null;
let selectedUser = null;
let allUsers = [];
let messageChannel = null;

const $ = id => document.getElementById(id);

function setStatus(message = "") {
  const el = $("status");
  if (el) el.textContent = message;
}

function initSupabase() {
  if (!window.supabase) {
    setStatus("Supabase ne se charge pas. Vérifie Internet.");
    return false;
  }

  if (!db) {
    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
  }

  return true;
}

async function authenticate() {
  if (!initSupabase()) return;

  setStatus("");

  const email = $("email").value.trim();
  const password = $("password").value;
  const name = $("name").value.trim();
  const signup = $("authTitle").dataset.mode !== "login";

  if (!email || !password || (signup && !name)) {
    setStatus("Remplis tous les champs obligatoires.");
    return;
  }

  if (password.length < 6) {
    setStatus("Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  $("submit").disabled = true;

  try {
    if (signup) {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (error) throw error;

      if (!data.session) {
        setStatus(
          "Compte créé ! Vérifie ton e-mail pour confirmer ton inscription."
        );
        return;
      }
    } else {
      const { error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    }

    await loadApp();
  } catch (error) {
    setStatus(error.message || "Erreur de connexion.");
  } finally {
    $("submit").disabled = false;
  }
}

function toggleMode() {
  const title = $("authTitle");
  const login = title.dataset.mode === "login";

  title.dataset.mode = login ? "signup" : "login";
  title.textContent = login
    ? "Créer un compte"
    : "Bienvenue sur M-EI HO";

  $("name").style.display = login ? "block" : "none";
  $("submit").textContent = login
    ? "Créer mon compte"
    : "Se connecter";

  $("switch").textContent = login
    ? "J'ai déjà un compte"
    : "Créer un nouveau compte";

  $("password").autocomplete = login
    ? "new-password"
    : "current-password";

  setStatus("");
}

async function loadApp() {
  if (!initSupabase()) return;

  const { data, error } = await db.auth.getSession();
  if (error) throw error;

  currentUser = data.session?.user || null;

  if (!currentUser) {
    $("auth").style.display = "block";
    $("app").style.display = "none";
    $("logout").style.display = "none";
    return;
  }

  $("auth").style.display = "none";
  $("app").style.display = "block";
  $("logout").style.display = "block";

  await loadUsers();
}

async function logout() {
  if (!initSupabase()) return;

  if (messageChannel) {
    await db.removeChannel(messageChannel);
    messageChannel = null;
  }

  const { error } = await db.auth.signOut();

  if (error) {
    alert("Déconnexion impossible : " + error.message);
    return;
  }

  currentUser = null;
  selectedUser = null;
  allUsers = [];

  $("app").style.display = "none";
  $("auth").style.display = "block";
  $("logout").style.display = "none";
  $("messages").textContent = "Connecte-toi pour commencer.";
}

async function loadUsers() {
  const { data, error } = await db
    .from("users")
    .select("id, full_name, email, avatar_url")
    .neq("id", currentUser.id)
    .order("full_name");

  if (error) {
    $("users").textContent =
      "Impossible de charger les utilisateurs. Vérifie la table users et ses autorisations.";
    console.error(error);
    return;
  }

  allUsers = data || [];
  filterUsers();
}

function filterUsers() {
  const query = ($("search")?.value || "").toLowerCase();

  const filtered = allUsers.filter(user =>
    (user.full_name || "").toLowerCase().includes(query) ||
    (user.email || "").toLowerCase().includes(query)
  );

  renderUsers(filtered);
}

function renderUsers(users) {
  const list = $("users");
  list.replaceChildren();

  if (!users.length) {
    list.textContent = "Aucun utilisateur trouvé.";
    return;
  }

  users.forEach(user => {
    const item = document.createElement("div");

    item.className =
      "person" +
      (selectedUser?.id === user.id ? " active" : "");

    item.textContent = user.full_name || user.email || "Utilisateur";
    item.onclick = () => openChat(user);

    list.appendChild(item);
  });
}

async function openChat(user) {
  selectedUser = user;

  $("chatTitle").textContent =
    user.full_name || user.email || "Discussion";

  $("message").disabled = false;
  $("sendBtn").disabled = false;

  filterUsers();
  await loadMessages();

  if (messageChannel) {
    await db.removeChannel(messageChannel);
  }

  const otherId = user.id;

  messageChannel = db
    .channel("chat-" + [currentUser.id, otherId].sort().join("-"))
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages"
      },
      payload => {
        const message = payload.new;

        if (
          (message.sender_id === currentUser.id &&
            message.receiver_id === selectedUser?.id) ||
          (message.sender_id === selectedUser?.id &&
            message.receiver_id === currentUser.id)
        ) {
          loadMessages();
        }
      }
    )
    .subscribe();
}

async function loadMessages() {
  if (!selectedUser || !currentUser) return;

  const otherId = selectedUser.id;

  const { data, error } = await db
    .from("messages")
    .select("id, sender_id, receiver_id, content, created_at")
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`
    )
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    $("messages").textContent =
      "Impossible de charger les messages. Vérifie les colonnes et les règles RLS.";
    console.error(error);
    return;
  }

  const box = $("messages");
  box.replaceChildren();

  (data || []).forEach(message => {
    const bubble = document.createElement("div");

    bubble.className =
      "bubble" +
      (message.sender_id === currentUser.id ? " mine" : "");

    bubble.textContent = message.content || "";

    const time = document.createElement("small");
    time.className = "message-time";
    time.textContent = new Date(
      message.created_at
    ).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    bubble.appendChild(document.createElement("br"));
    bubble.appendChild(time);
    box.appendChild(bubble);
  });

  box.scrollTop = box.scrollHeight;
}

async function sendMessage(event) {
  event.preventDefault();

  if (!selectedUser || !currentUser) return;

  const input = $("message");
  const content = input.value.trim();

  if (!content) return;

  $("sendBtn").disabled = true;

  try {
    const { error } = await db.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content
    });

    if (error) throw error;

    input.value = "";
    await loadMessages();
  } catch (error) {
    alert("Message non envoyé : " + error.message);
  } finally {
    $("sendBtn").disabled = false;
  }
}

async function start() {
  if (!initSupabase()) return;

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      setTimeout(() => {
        loadApp().catch(error => setStatus(error.message));
      }, 0);
    }
  });

  try {
    await loadApp();
  } catch (error) {
    setStatus(error.message || "Erreur au démarrage.");
  }
}

start();
