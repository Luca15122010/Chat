import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://koqiyygtjcxhmkdypsbo.supabase.co";
const SUPABASE_KEY = "sb_publishable_ffqFk89gZw1nNbfnPpJi9A_nC2aJN9e";

const BUCKET = "Chat-files";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==========================================
// ELEMENTE
// ==========================================

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


// ==========================================
// LOGIN
// ==========================================

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

    loginError.textContent =
      error.message;

    console.error(
      "Login-Fehler:",
      error
    );

    return;
  }

  currentUser = data.user;

  showChat();
});


// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener("click", async () => {

  await supabase.auth.signOut();

  currentUser = null;

  chatScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");

  messagesContainer.innerHTML = "";
});


// ==========================================
// CHAT ANZEIGEN
// ==========================================

function showChat() {

  loginScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  loadMessages();
}


// ==========================================
// AUSGEBLENDETE NACHRICHTEN LADEN
// ==========================================

async function getHiddenMessageIds() {

  if (!currentUser) {
    return new Set();
  }

  const { data, error } =
    await supabase
      .from("hidden_messages")
      .select("message_id")
      .eq(
        "user_id",
        currentUser.id
      );

  if (error) {

    console.error(
      "Fehler bei hidden_messages:",
      error
    );

    return new Set();
  }

  return new Set(
    data.map(row => row.message_id)
  );
}


// ==========================================
// ALLE NACHRICHTEN LADEN
// ==========================================

async function loadMessages() {

  if (!currentUser) {
    return;
  }

  const hiddenIds =
    await getHiddenMessageIds();

  const { data, error } =
    await supabase
      .from("messages")
      .select("*")
      .order("created_at", {
        ascending: true
      });

  if (error) {

    console.error(
      "Fehler beim Laden:",
      error
    );

    return;
  }

  messagesContainer.innerHTML = "";

  for (const message of data) {

    if (
      hiddenIds.has(message.id)
    ) {
      continue;
    }

    displayMessage(message);
  }

  scrollToBottom();
}


// ==========================================
// NACHRICHT ANZEIGEN
// ==========================================

function displayMessage(message) {

  if (!message || !message.id) {
    return;
  }


  // Prüfen, ob Nachricht bereits existiert

  const existing =
    document.querySelector(
      `[data-message-id="${message.id}"]`
    );

  if (existing) {
    return;
  }


  const messageElement =
    document.createElement("div");

  messageElement.className =
    "message";

  messageElement.dataset.messageId =
    message.id;


  const isMine =
    currentUser &&
    message.user_id === currentUser.id;


  if (isMine) {

    messageElement.classList.add(
      "mine"
    );

  } else {

    messageElement.classList.add(
      "theirs"
    );
  }


  // ========================================
  // TEXT
  // ========================================

  if (message.content) {

    const text =
      document.createElement("div");

    text.textContent =
      message.content;

    messageElement.appendChild(
      text
    );
  }


  // ========================================
  // BILD
  // ========================================

  if (
    message.file_url &&
    message.file_type &&
    message.file_type.startsWith(
      "image/"
    )
  ) {

    const image =
      document.createElement("img");

    image.src =
      message.file_url;

    image.alt =
      "Bild";

    image.loading =
      "lazy";

    image.style.maxWidth =
      "100%";

    image.style.borderRadius =
      "12px";

    messageElement.appendChild(
      image
    );
  }


  // ========================================
  // VIDEO
  // ========================================

  if (
    message.file_url &&
    message.file_type &&
    message.file_type.startsWith(
      "video/"
    )
  ) {

    const video =
      document.createElement("video");

    video.src =
      message.file_url;

    video.controls =
      true;

    video.playsInline =
      true;

    video.preload =
      "metadata";

    video.style.maxWidth =
      "100%";

    video.style.borderRadius =
      "12px";

    messageElement.appendChild(
      video
    );
  }


  // ========================================
  // ZEIT
  // ========================================

  const timestamp =
    document.createElement("span");

  timestamp.className =
    "timestamp";

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

  messageElement.appendChild(
    timestamp
  );


  // ========================================
  // LÖSCHEN
  // ========================================

  const deleteButton =
    document.createElement("button");

  deleteButton.textContent =
    "Löschen";

  deleteButton.className =
    "delete-button";


  deleteButton.addEventListener(
    "click",
    async () => {

      if (isMine) {

        const confirmed =
          confirm(
            "Diese Nachricht für beide löschen?"
          );

        if (!confirmed) {
          return;
        }


        // Eigene Nachricht:
        // vollständig aus messages löschen

        const { error } =
          await supabase
            .from("messages")
            .delete()
            .eq(
              "id",
              message.id
            )
            .eq(
              "user_id",
              currentUser.id
            );

        if (error) {

          console.error(
            "Delete-Fehler:",
            error
          );

          alert(
            "Löschen fehlgeschlagen:\n\n" +
            error.message
          );

          return;
        }


        // Sofort lokal entfernen

        messageElement.remove();

      } else {

        const confirmed =
          confirm(
            "Diese Nachricht nur bei dir ausblenden?"
          );

        if (!confirmed) {
          return;
        }


        // Nachricht der Freundin:
        // nur für diesen Benutzer ausblenden

        const { error } =
          await supabase
            .from("hidden_messages")
            .insert({
              message_id:
                message.id,

              user_id:
                currentUser.id
            });

        if (error) {

          console.error(
            "Hide-Fehler:",
            error
          );

          alert(
            "Nachricht konnte nicht ausgeblendet werden:\n\n" +
            error.message
          );

          return;
        }


        messageElement.remove();
      }
    }
  );


  messageElement.appendChild(
    deleteButton
  );


  messagesContainer.appendChild(
    messageElement
  );
}


// ==========================================
// TEXTNACHRICHT SENDEN
// ==========================================

async function sendMessage() {

  const content =
    messageInput.value.trim();

  if (
    !content ||
    !currentUser
  ) {
    return;
  }

  sendButton.disabled =
    true;

  const { data, error } =
    await supabase
      .from("messages")
      .insert({
        user_id:
          currentUser.id,

        content:
          content
      })
      .select()
      .single();

  sendButton.disabled =
    false;


  if (error) {

    console.error(
      "Send-Fehler:",
      error
    );

    alert(
      "Nachricht konnte nicht gesendet werden:\n\n" +
      error.message
    );

    return;
  }


  // SOFORT anzeigen

  displayMessage(data);

  messageInput.value = "";

  scrollToBottom();
}


// ==========================================
// DATEI HOCHLADEN
// ==========================================

async function uploadFile(file) {

  if (
    !currentUser ||
    !file
  ) {
    return;
  }


  const isImage =
    file.type.startsWith(
      "image/"
    );

  const isVideo =
    file.type.startsWith(
      "video/"
    );


  if (
    !isImage &&
    !isVideo
  ) {

    alert(
      "Bitte nur Bilder oder Videos auswählen."
    );

    return;
  }


  // 50 MB

  const maxSize =
    50 * 1024 * 1024;

  if (
    file.size > maxSize
  ) {

    alert(
      "Die Datei darf maximal 50 MB groß sein."
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


  fileInput.disabled =
    true;


  try {

    // ======================================
    // UPLOAD
    // ======================================

    const {
      error: uploadError
    } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          filePath,
          file,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              file.type
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


    // ======================================
    // SIGNIERTE URL
    // ======================================

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
        "Die Datei wurde hochgeladen, aber die URL konnte nicht erstellt werden."
      );

      return;
    }


    // ======================================
    // NACHRICHT ERSTELLEN
    // ======================================

    const {
      data: message,
      error: messageError
    } =
      await supabase
        .from("messages")
        .insert({
          user_id:
            currentUser.id,

          content:
            null,

          file_url:
            urlData.signedUrl,

          file_type:
            file.type
        })
        .select()
        .single();


    if (messageError) {

      console.error(
        "Message:",
        messageError
      );

      alert(
        "Datei wurde hochgeladen, aber nicht im Chat gespeichert:\n\n" +
        messageError.message
      );

      return;
    }


    // SOFORT ANZEIGEN

    displayMessage(message);

    scrollToBottom();

  } finally {

    fileInput.disabled =
      false;

    fileInput.value =
      "";
  }
}


// ==========================================
// DATEI AUSWÄHLEN
// ==========================================

fileInput.addEventListener(
  "change",
  async () => {

    const file =
      fileInput.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);
  }
);


// ==========================================
// SENDEN BUTTON
// ==========================================

sendButton.addEventListener(
  "click",
  sendMessage
);


// ==========================================
// ENTER = SENDEN
// ==========================================

messageInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      sendMessage();
    }
  }
);


// ==========================================
// REALTIME
// ==========================================

supabase
  .channel(
    "messages-channel"
  )

  // ========================================
  // NEUE NACHRICHT
  // ========================================

  .on(
    "postgres_changes",
    {
      event:
        "INSERT",

      schema:
        "public",

      table:
        "messages"
    },

    async payload => {

      if (
        !currentUser
      ) {
        return;
      }


      const hiddenIds =
        await getHiddenMessageIds();


      if (
        hiddenIds.has(
          payload.new.id
        )
      ) {
        return;
      }


      displayMessage(
        payload.new
      );

      scrollToBottom();
    }
  )


  // ========================================
  // GELÖSCHTE NACHRICHT
  // ========================================

  .on(
    "postgres_changes",
    {
      event:
        "DELETE",

      schema:
        "public",

      table:
        "messages"
    },

    payload => {

      const element =
        document.querySelector(
          `[data-message-id="${payload.old.id}"]`
        );

      if (element) {
        element.remove();
      }
    }
  )


  .subscribe();


// ==========================================
// SCROLL
// ==========================================

function scrollToBottom() {

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// ==========================================
// SESSION PRÜFEN
// ==========================================

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


  if (
    data &&
    data.session
  ) {

    currentUser =
      data.session.user;

    showChat();
  }
}


// ==========================================
// START
// ==========================================

checkSession();
