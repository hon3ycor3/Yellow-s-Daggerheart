import OBR from "@owlbear-rodeo/sdk";
import {
  appendToChatLog,
  getAutoOpenEnabled,
  PING_CHANNEL,
  postLocalBus,
} from "./pingChannel.js";

let unreadCount = 0;

async function clearUnreadBadge() {
  unreadCount = 0;
  try {
    await OBR.action.setBadgeText(undefined);
  } catch {
    // Ignore
  }
}

OBR.onReady(async () => {
  const myPlayerId = await OBR.player.getId();

  OBR.action.onOpenChange((isOpen) => {
    if (isOpen) {
      void clearUnreadBadge();
    }
  });

  OBR.broadcast.onMessage(PING_CHANNEL, async (event) => {
    const msg = /** @type {import("./pingChannel.js").PartyChatMessage} */ (
      event.data
    );
    if (!msg || typeof msg.id !== "string") return;

    const isNew = appendToChatLog(msg);
    if (!isNew) return;

    // Notify open chat.html immediately over same-origin bus
    postLocalBus({ type: "message", message: msg });

    const isOpen = await OBR.action.isOpen();
    if (isOpen) {
      await clearUnreadBadge();
      return;
    }

    // Try popping open the companion chat extension itself when auto-open is enabled
    let opened = false;
    if (getAutoOpenEnabled()) {
      try {
        await OBR.action.open();
        opened = await OBR.action.isOpen();
      } catch {
        opened = false;
      }
    }

    if (opened) {
      await clearUnreadBadge();
      return;
    }

    // Fallback: unread badge + minimal toast showing only who sent the message
    unreadCount += 1;
    try {
      await OBR.action.setBadgeBackgroundColor("#7c3aed");
      await OBR.action.setBadgeText(
        unreadCount > 99 ? "99+" : String(unreadCount),
      );
    } catch {
      // Ignore badge styling errors
    }

    // Avoid toasting yourself if you turned off auto-open and pinged from your own sheet
    if (msg.senderId !== myPlayerId) {
      const sender = msg.senderName || "A player";
      await OBR.notification.show(`${sender} sent a message`);
    }
  });
});
