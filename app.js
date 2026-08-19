import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://koqiyygtjcxhmkdypsbo.supabase.co";
const SUPABASE_KEY = "sb_publishable_ffqFk89gZw1nNbfnPpJi9A_nC2aJN9e";

const BUCKET = "Chat-files";

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
const fileInput = document.getElementById("file-input");

let currentUser = null;


// ===============================
// LOGIN
// ===============================

loginButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginError.textContent = "";

  if (!email || !password) {
    loginError.textContent =
      "Bitte E-Mail und Passwort eingeben.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Anmelden...";

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  loginButton.disabled = false;
  loginButton.textContent = "Anmelden";

  if (error) {
    loginError.textContent = error.message;
    console.error("Login:", error);
    return;
  }

  currentUser = data.user;

  showChat();
});


// ===============================
// LOGOUT
// ===============================

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();

  currentUser = null;

  chatScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");

  messagesContainer.innerHTML = "";
});


// ===============================
// CHAT ANZEIGEN
// ===============================

function showChat() {
  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  loadMessages();
}


// ===============================
// NACHRICHTEN LADEN
// ===============================

async function loadMessages() {
  if (!currentUser) return;

  const { data, error } =
    await supabase
      .from("messages")
      .select("*")
      .order("created_at", {
        ascending: true
      });

  if (error) {
    console.error("Nachrichten:", error);
    return;
  }

  messagesContainer.innerHTML = "";

  data.forEach(message => {
    displayMessage(message);
  });

  scrollToBottom();
}


// ===============================
// NACHRICHT ANZEIGEN
// ===============================

function displayMessage(message) {
  const messageElement =
    document.createElement("div");

  messageElement.classList.add("message");

  if (
    currentUser &&
    message.user_id === currentUser.id
  ) {
    messageElement.classList.add("mine");
  } else {
    messageElement.classList.add("theirs");
  }

  // TEXT

  if (message.content) {
    const text =
      document.createElement("div");

    text.textContent =
      message.content;

    messageElement.appendChild(text);
  }

  // BILD

  if (
    message.file_url &&
    message.file_type?.startsWith("image/")
  ) {
    const image =
      document.createElement("img");

    image.src = message.file_url;
    image.alt = "Bild";
    image.loading = "lazy";

    messageElement.appendChild(image);
  }

  // VIDEO

  if (
    message.file_url &&
    message.file_type?.startsWith("video/")
  ) {
    const video =
      document.createElement("video");

    video.src = message.file_url;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";

    messageElement.appendChild(video);
  }

  // ZEIT

  const timestamp =
    document.createElement("span");

  timestamp.className = "timestamp";

  timestamp.textContent =
    new Date(
      message.created_at
    ).toLocaleTimeString(
      "de-DE",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  messageElement.appendChild(timestamp);

  messagesContainer.appendChild(
    messageElement
  );
}


// ===============================
// TEXTNACHRICHT SENDEN
// ===============================

async function sendMessage() {
  const content =
    messageInput.value.trim();

  if (!content || !currentUser) {
    return;
  }

  sendButton.disabled = true;

  const { error } =
    await supabase
      .from("messages")
      .insert({
        user_id: currentUser.id,
        content: content
      });

  sendButton.disabled = false;

  if (error) {
    console.error("Senden:", error);

    alert(
      "Nachricht konnte nicht gesendet werden:\n\n" +
      error.message
    );

    return;
  }

  messageInput.value = "";
}


// ===============================
// DATEI HOCHLADEN
// ===============================

async function uploadFile(file) {
  if (!currentUser || !file) {
    return;
  }

  const isImage =
    file.type.startsWith("image/");

  const isVideo =
    file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    alert(
      "Bitte nur Bilder oder Videos auswählen."
    );

    return;
  }

  // Maximale Dateigröße: 100 MB

  const maxSize =
    100 * 1024 * 1024;

  if (file.size > maxSize) {
    alert(
      "Die Datei darf maximal 100 MB groß sein."
    );

    return;
  }

  const extension =
    file.name.includes(".")
      ? file.name.substring(
          file.name.lastIndexOf(".")
        )
      : "";

  const fileName =
    `${crypto.randomUUID()}${extension}`;

  const filePath =
    `${currentUser.id}/${fileName}`;

  fileInput.disabled = true;

  try {

    // Upload

    const { error: uploadError } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
          }
        );

    if (uploadError) {
      console.error(
        "Upload:",
        uploadError
      );

      alert(
        "Upload fehlgeschlagen:\n\n" +
        uploadError.message
      );

      return;
    }


    // Sichere URL

    const {
      data: urlData,
      error: urlError
    } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUrl(
          filePath,
          60 * 60 * 24 * 365
        );

    if (urlError) {
      console.error(
        "URL:",
        urlError
      );

      alert(
        "Datei wurde hochgeladen, aber die URL konnte nicht erstellt werden."
      );

      return;
    }


    // Datei als Chatnachricht speichern

    const { error: messageError } =
      await supabase
        .from("messages")
        .insert({
          user_id: currentUser.id,
          content: null,
          file_url: urlData.signedUrl,
          file_type: file.type
        });

    if (messageError) {
      console.error(
        "Message:",
        messageError
      );

      alert(
        "Datei wurde hochgeladen, konnte aber nicht im Chat gespeichert werden:\n\n" +
        messageError.message
      );

      return;
    }

  } finally {
    fileInput.disabled = false;
    fileInput.value = "";
  }
}


// ===============================
// DATEI AUSWÄHLEN
// ===============================

fileInput.addEventListener(
  "change",
  async () => {
    const file =
      fileInput.files?.[0];

    if (!file) return;

    await uploadFile(file);
  }
);


// ===============================
// SENDEN
// ===============================

sendButton.addEventListener(
  "click",
  sendMessage
);


// ===============================
// ENTER
// ===============================

messageInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  }
);


// ===============================
// REALTIME
// ===============================

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
      if (!currentUser) return;

      displayMessage(payload.new);

      scrollToBottom();
    }
  )
  .subscribe();


// ===============================
// SCROLL
// ===============================

function scrollToBottom() {
  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// ===============================
// SESSION
// ===============================

async function checkSession() {
  const {
    data,
    error
  } =
    await supabase.auth.getSession();

  if (error) {
    console.error(
      "Session:",
      error
    );

    return;
  }

  if (data.session) {
    currentUser =
      data.session.user;

    showChat();
  }
}


// ===============================
// START
// ===============================

checkSession();
