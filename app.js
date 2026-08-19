 
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://koqiyygtjcxhmkdypsbo.supabase.co";
const SUPABASE_KEY = "sb_publishable_...";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");

const loginError = document.getElementById("login-error");

const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

let currentUser = null;


// =========================
// LOGIN
// =========================

loginButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginError.textContent = "";

  if (!email || !password) {
    loginError.textContent = "Bitte E-Mail und Passwort eingeben.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Anmelden...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  loginButton.disabled = false;
  loginButton.textContent = "Anmelden";

  if (error) {
  loginError.textContent = error.message;
  console.error(error);
  return;
}

  currentUser = data.user;

  showChat();
});


// =========================
// LOGOUT
// =========================

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();

  currentUser = null;

  chatScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");

  messagesContainer.innerHTML = "";
});


// =========================
// CHAT ANZEIGEN
// =========================

function showChat() {
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  loadMessages();
}


// =========================
// NACHRICHTEN LADEN
// =========================

async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", {
      ascending: true
    });

  if (error) {
    console.error(error);
    return;
  }

  messagesContainer.innerHTML = "";

  data.forEach(message => {
    displayMessage(message);
  });

  scrollToBottom();
}


// =========================
// NACHRICHT ANZEIGEN
// =========================

function displayMessage(message) {
  const messageElement = document.createElement("div");

  messageElement.classList.add("message");

  if (message.user_id === currentUser.id) {
    messageElement.classList.add("mine");
  } else {
    messageElement.classList.add("theirs");
  }

  if (message.content) {
    const text = document.createElement("div");
    text.textContent = message.content;

    messageElement.appendChild(text);
  }

  const timestamp = document.createElement("span");

  timestamp.className = "timestamp";

  timestamp.textContent = new Date(
    message.created_at
  ).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });

  messageElement.appendChild(timestamp);

  messagesContainer.appendChild(messageElement);
}


// =========================
// NACHRICHT SENDEN
// =========================

async function sendMessage() {
  const content = messageInput.value.trim();

  if (!content || !currentUser) {
    return;
  }

  sendButton.disabled = true;

  const { error } = await supabase
    .from("messages")
    .insert({
      user_id: currentUser.id,
      content: content
    });

  sendButton.disabled = false;

  if (error) {
    console.error(error);
    alert("Nachricht konnte nicht gesendet werden.");
    return;
  }

  messageInput.value = "";
}


// =========================
// SENDEN BUTTON
// =========================

sendButton.addEventListener("click", sendMessage);


// =========================
// ENTER = SENDEN
// =========================

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});


// =========================
// LIVE NACHRICHTEN
// =========================

supabase
  .channel("messages-channel")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages"
    },
    payload => {

      if (!currentUser) {
        return;
      }

      displayMessage(payload.new);

      scrollToBottom();
    }
  )
  .subscribe();


// =========================
// NACH UNTEN SCROLLEN
// =========================

function scrollToBottom() {
  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// =========================
// BEREITS EINGELOGGT?
// =========================

async function checkSession() {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    showChat();
  }
}

checkSession();
