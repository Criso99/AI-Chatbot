// === Libreria LZString per compressione ===
const LZString = {
  compress: str => btoa(unescape(encodeURIComponent(str))),
  decompress: str => decodeURIComponent(escape(atob(str)))
};

// === Stato globale ===
let chats = {};
let currentChatId = null;

// === Elementi DOM ===
const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const chatList = document.getElementById("chat-list");
const newChatBtn = document.getElementById("new-chat");
const sidebar = document.getElementById("sidebar");
const toggleSidebar = document.getElementById("toggle-sidebar");

// === API Key e URL ===
const API_KEY = "5UF4GGoVxSD0SNOpZweUMGTdmlAYBJAs"; // Sostituisci con la tua vera API key
const API_URL = "https://api.mistral.ai/v1/chat/completions";

// === Utility per salvataggio e caricamento chat compressa ===
function saveChats() {
  const compressed = LZString.compress(JSON.stringify(chats));
  localStorage.setItem("chats", compressed);
}

function loadChats() {
  const compressed = localStorage.getItem("chats");
  if (compressed) {
    try {
      chats = JSON.parse(LZString.decompress(compressed));
    } catch {
      chats = {};
    }
  }
}

// === Genera ID chat unico ===
function createChatId() {
  return Date.now().toString();
}

// === Render lista chat con pulsanti elimina ===
function renderChatList() {
  chatList.innerHTML = "";
  for (const id in chats) {
    const li = document.createElement("li");

    const titleSpan = document.createElement("span");
    titleSpan.textContent = chats[id].title || `Chat ${id}`;
    titleSpan.style.flex = "1";
    titleSpan.style.cursor = "pointer";
    titleSpan.onclick = () => loadChat(id);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "delete-chat-btn";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm("Sei sicuro di eliminare questa chat?")) {
        delete chats[id];
        if (currentChatId === id) {
          currentChatId = null;
          chatWindow.innerHTML = "";
        }
        saveChats();
        renderChatList();

        const ids = Object.keys(chats);
        if (ids.length > 0) {
          loadChat(ids[ids.length - 1]);
        }
      }
    };

    li.appendChild(titleSpan);
    li.appendChild(deleteBtn);
    chatList.appendChild(li);
  }
}

// === Render messaggi nella chat corrente ===
function renderMessages(messages) {
  chatWindow.innerHTML = "";
  messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.role === "user" ? "user-message" : "ai-message"}`;
    div.textContent = msg.content;
    chatWindow.appendChild(div);
  });
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// === Carica una chat dalla lista e mostra messaggi ===
function loadChat(id) {
  currentChatId = id;
  const chat = chats[id];
  renderMessages(chat.messages);
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
  }
}

// === Crea nuova chat vuota e la carica ===
function newChat() {
  const id = createChatId();
  chats[id] = {
    title: `Nuova chat`,
    messages: []
  };
  currentChatId = id;
  renderChatList();
  renderMessages([]);
  saveChats();
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
  }
}

// === Invia messaggio all’API Mistral e aggiorna chat ===
async function sendMessage(content) {
  if (!currentChatId) return;

  const chat = chats[currentChatId];
  const userMsg = { role: "user", content };
  chat.messages.push(userMsg);
  renderMessages(chat.messages);
  chatInput.value = "";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-medium-2505",
        messages: chat.messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Errore API:", errText);
      alert(`Errore API: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message;
    chat.messages.push(aiResponse);
    renderMessages(chat.messages);
    saveChats();
  } catch (error) {
    console.error("Errore connessione:", error);
    alert("Errore nella connessione con Mistral.");
  }
}

// === Eventi DOM ===
chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (msg !== "") {
    sendMessage(msg);
  }
});

newChatBtn.addEventListener("click", newChat);

toggleSidebar.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

// === Inizializzazione ===
loadChats();
renderChatList();

const ids = Object.keys(chats);
if (ids.length > 0) {
  loadChat(ids[ids.length - 1]);
} else {
  newChat();
}
