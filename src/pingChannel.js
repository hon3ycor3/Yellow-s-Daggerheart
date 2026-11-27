import OBR from "@owlbear-rodeo/sdk";
import { makeShortId } from "./state.js";

export const PING_CHANNEL = "yellow-daggerheart/party-chat-v1";
const LOG_STORAGE_KEY = "yellow-daggerheart-chat-log-v1";
const AUTO_OPEN_KEY = "yellow-daggerheart-chat-auto-open";
const LOCAL_BUS_NAME = "yellow-daggerheart-chat-bus-v1";
const MAX_LOG_MESSAGES = 80;

/**
 * @typedef {"hope" | "class" | "subclass" | "heritage" | "experience" | "domain" | "inventory" | "chat"} PingAccent
 *
 * @typedef {Object} PartyChatMessage
 * @property {string} id
 * @property {"ping" | "chat"} kind
 * @property {number} timestamp
 * @property {string} senderId
 * @property {string} senderName
 * @property {string} [characterName]
 * @property {string} [category]
 * @property {string} [title]
 * @property {string} [tag]
 * @property {string} text
 * @property {string} [accent] - e.g. "hope", "subclass", "heritage", "experience", "inventory", or domain name ("arcana", "blade", ...)
 */

/** @returns {boolean} */
export function getAutoOpenEnabled() {
  try {
    return localStorage.getItem(AUTO_OPEN_KEY) !== "false";
  } catch {
    return true;
  }
}

/** @param {boolean} enabled */
export function setAutoOpenEnabled(enabled) {
  try {
    localStorage.setItem(AUTO_OPEN_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}

/** @returns {PartyChatMessage[]} */
export function readChatLog() {
  try {
    const raw = sessionStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Appends a message to the session log if its `id` is not already present.
 * @param {PartyChatMessage} msg
 * @returns {boolean} True if added (false if duplicate)
 */
export function appendToChatLog(msg) {
  if (!msg || typeof msg !== "object" || typeof msg.id !== "string") {
    return false;
  }
  const log = readChatLog();
  if (log.some((entry) => entry.id === msg.id)) return false;

  log.push(msg);
  if (log.length > MAX_LOG_MESSAGES) {
    log.splice(0, log.length - MAX_LOG_MESSAGES);
  }

  try {
    sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Ignore storage quota errors
  }
  return true;
}

export function clearChatLog() {
  try {
    sessionStorage.removeItem(LOG_STORAGE_KEY);
  } catch {
    // Ignore
  }
  postLocalBus({ type: "clear" });
}

/** @param {unknown} payload */
export function postLocalBus(payload) {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(LOCAL_BUS_NAME);
    ch.postMessage(payload);
    ch.close();
  } catch {
    // Ignore if unavailable
  }
}

/**
 * Subscribes to same-origin updates between `chat-bg.html` and `chat.html`.
 * @param {(payload: any) => void} handler
 */
export function onLocalBus(handler) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const ch = new BroadcastChannel(LOCAL_BUS_NAME);
  ch.onmessage = (event) => handler(event.data);
  return () => ch.close();
}

/**
 * Sends a feature ping or text message to everyone in the OBR room (including your own chat panel).
 * @param {Omit<PartyChatMessage, "id" | "timestamp">} data
 * @param {boolean} obrConnected
 */
export async function broadcastPartyMessage(data, obrConnected) {
  /** @type {PartyChatMessage} */
  const payload = {
    ...data,
    id: `m_${Date.now().toString(36)}_${makeShortId()}`,
    timestamp: Date.now(),
  };

  if (obrConnected) {
    await OBR.broadcast.sendMessage(PING_CHANNEL, payload, {
      destination: "ALL",
    });
  } else {
    // Local standalone preview fallback (testing sheet + chat.html in two browser tabs)
    appendToChatLog(payload);
    postLocalBus({ type: "message", message: payload });
  }

  return payload;
}
