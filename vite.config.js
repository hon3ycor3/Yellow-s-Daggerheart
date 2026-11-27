import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/Yellow-s-Daggerheart/",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        chat: fileURLToPath(new URL("./chat.html", import.meta.url)),
        chatBg: fileURLToPath(new URL("./chat-bg.html", import.meta.url)),
      },
    },
  },
});
