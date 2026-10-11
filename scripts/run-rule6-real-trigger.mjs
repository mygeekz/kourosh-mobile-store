import express from "express";
import { registerKouroshAppComposition } from "../server/bootstrap/appComposition.ts";

console.log("RULE6 REAL TRIGGER START");

try {
  const app = express();

  const {
    messagingRuntime,
  } = registerKouroshAppComposition(app);

  if (!messagingRuntime?.runAutoSendRulesOnce) {
    throw new Error(
      "runAutoSendRulesOnce is not available on messagingRuntime"
    );
  }

  console.log("runtime ready");

  const result = await messagingRuntime.runAutoSendRulesOnce();

  console.log("RULE6 EXECUTION RESULT:");
  console.dir(result, { depth: 10 });

  console.log("RULE6 REAL TRIGGER DONE");

  process.exit(0);

} catch (error) {
  console.error("RULE6 REAL TRIGGER FAILED:");
  console.error(error);
  process.exit(1);
}