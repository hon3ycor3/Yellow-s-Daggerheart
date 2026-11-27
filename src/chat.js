import OBR from "@owlbear-rodeo/sdk";
import "./styles/chat.css";
import {
  appendToChatLog,
  broadcastPartyMessage,
  clearChatLog,
  getAutoOpenEnabled,
  onLocalBus,
  PING_CHANNEL,
  readChatLog,
  setAutoOpenEnabled,
} from "./pingChannel.js";

const feedEl = document.getElementById("chat-feed");
const statusBadgeEl = document.getElementById("chat-status-badge");
const autoOpenEl = document.getElementById("chat-auto-open");
const clearBtn = document.getElementById("chat-clear-btn");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");

let obrConnected = false;
let playerId = "local";
let playerName = "Player";
/** @type {Set<string>} */
const renderedIds = new Set();

/** @param {number} ts */
function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function renderEmptyState() {
  if (!feedEl) return;
  feedEl.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "chat-empty";
  empty.textContent =
    "Click the bell Ping icon on any feature, Experience, Domain Card, or Inventory item in Yellow's Daggerheart to share it here.";
  feedEl.appendChild(empty);
}

/** @param {import("./pingChannel.js").PartyChatMessage} msg */
function buildMessageEl(msg) {
  const card = document.createElement("article");
  card.className = "chat-entry";
  if (msg.accent) {
    card.classList.add(`accent-${msg.accent.toLowerCase()}`);
  }

  const meta = document.createElement("div");
  meta.className = "chat-entry-meta";

  const who = document.createElement("span");
  const senderSpan = document.createElement("span");
  senderSpan.className = "chat-sender";
  senderSpan.textContent = msg.characterName
    ? `${msg.characterName} (${msg.senderName})`
    : msg.senderName;
  who.appendChild(senderSpan);

  const time = document.createElement("span");
  time.textContent = formatTime(msg.timestamp);

  meta.append(who, time);
  card.appendChild(meta);

  if (msg.kind === "ping") {
    const header = document.createElement("div");
    header.className = "chat-entry-header";

    const title = document.createElement("strong");
    title.className = "chat-entry-title";
    title.textContent = msg.title || msg.category || "Feature Ping";

    header.appendChild(title);

    if (msg.tag) {
      const tag = document.createElement("span");
      tag.className = "chat-entry-tag";
      tag.textContent = msg.tag;
      header.appendChild(tag);
    }

    card.appendChild(header);
  }

  if (msg.text && msg.text.trim()) {
    const p = document.createElement("p");
    p.className = "chat-entry-text";
    p.textContent = msg.text;
    card.appendChild(p);
  }

  return card;
}

/** @param {import("./pingChannel.js").PartyChatMessage} msg */
function appendMessageToUI(msg) {
  if (!feedEl || renderedIds.has(msg.id)) return;
  if (renderedIds.size === 0) {
    feedEl.replaceChildren();
  }
  renderedIds.add(msg.id);
  feedEl.appendChild(buildMessageEl(msg));
  feedEl.scrollTop = feedEl.scrollHeight;
}

function hydrateFeedFromSession() {
  renderedIds.clear();
  const history = readChatLog();
  if (history.length === 0) {
    renderEmptyState();
    return;
  }
  if (feedEl) feedEl.replaceChildren();
  for (const msg of history) {
    appendMessageToUI(msg);
  }
}

if (autoOpenEl instanceof HTMLInputElement) {
  autoOpenEl.checked = getAutoOpenEnabled();
  autoOpenEl.addEventListener("change", () => {
    setAutoOpenEnabled(autoOpenEl.checked);
  });
}

clearBtn?.addEventListener("click", () => {
  clearChatLog();
  renderedIds.clear();
  renderEmptyState();
});

formEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(inputEl instanceof HTMLInputElement)) return;
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";
  const sent = await broadcastPartyMessage(
    {
      kind: "chat",
      senderId: playerId,
      senderName: playerName,
      text,
      accent: "chat",
    },
    obrConnected,
  );
  appendToChatLog(sent);
  appendMessageToUI(sent);
});

hydrateFeedFromSession();

onLocalBus((payload) => {
  if (payload?.type === "clear") {
    renderedIds.clear();
    renderEmptyState();
  } else if (payload?.type === "message" && payload.message) {
    appendMessageToUI(payload.message);
  }
});

OBR.onReady(async () => {
  obrConnected = true;
  [playerId, playerName] = await Promise.all([
    OBR.player.getId(),
    OBR.player.getName(),
  ]);

  if (statusBadgeEl) {
    statusBadgeEl.textContent = playerName;
    statusBadgeEl.classList.add("connected");
  }

  // Clear any badge when opening the chat panel
  try {
    await OBR.action.setBadgeText(undefined);
  } catch {
    // Ignore
  }

  // Fallback listener if messages arrive while chat.html is mounted
  OBR.broadcast.onMessage(PING_CHANNEL, (event) => {
    const msg = /** @type {import("./pingChannel.js").PartyChatMessage} */ (
      event.data
    );
    if (!msg || typeof msg.id !== "string") return;
    appendToChatLog(msg);
    appendMessageToUI(msg);
  });
});
