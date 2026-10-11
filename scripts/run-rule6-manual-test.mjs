import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

console.log("RULE6 MANUAL TEST START");

try {
  const mod = await import(
    "../server/utils/telegramEventNotificationRuntime.ts"
  );

  console.log("exports:", Object.keys(mod));

  if (!mod.createTelegramEventNotificationRuntime) {
    throw new Error(
      "createTelegramEventNotificationRuntime export not found"
    );
  }

  console.log(
    "Factory found. Need runtime bootstrap dependencies."
  );

} catch (err) {
  console.error("FAILED:", err);
  process.exit(1);
}