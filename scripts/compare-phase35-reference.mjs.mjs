import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const testRoot = process.argv[2];
const astraRoot = process.argv[3];

if (!testRoot || !astraRoot) {
  console.log(`
Usage:

node scripts/compare-phase35-test-astra.mjs "D:\\Kourosh\\Test" "D:\\Kourosh\\Astra"
`);
  process.exit(1);
}

const files = [
  "components/SmsReminderRuleFields.tsx",

  "server/bootstrap/messagingRuntime.ts",
  "server/routes/reminderRules.routes.ts",
  "server/routes/reminderRuntime.routes.ts",

  "server/services/customers.service.ts",
  "server/services/installments.service.ts",

  "server/utils/notificationOutboxRuntime.ts",
  "server/utils/smsLogHelpers.ts",
  "server/utils/telegramEventNotificationRuntime.ts",
  "server/utils/notificationAmountIntegrity.ts",
  "server/utils/notificationContext.ts",

  "shared/messages.ts",

  "shared/notifications/",
  "server/notifications/rules/",

  "scripts/setup-sms-rule-shadow.mjs",
  "scripts/lib/sms-rule-shadow-setup.mjs",
  "scripts/lib/notification-rule-shadow-harness.mjs",

  "scripts/audit-notification-rule-shadow.mjs",
  "scripts/audit-sms-reminder-readiness.mjs",
  "scripts/audit-sms-rule-shadow-parity.mjs",

  "scripts/test-notification-observability.mjs",
  "scripts/test-notification-outbox-reliability.mjs",
  "scripts/test-notification-rule-shadow.mjs",
  "scripts/test-notification-scheduler-shadow.mjs",

  "scripts/test-sms-reminder-rule-builder.mjs",
  "scripts/test-sms-reminder-rule-readiness.mjs",
  "scripts/test-sms-rule-shadow-migration.mjs"
];


function sha256(file) {
  const data = fs.readFileSync(file);
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}


function check(target, rel) {
  const full = path.join(target, rel);

  if (!fs.existsSync(full)) {
    return {
      exists:false
    };
  }

  const stat = fs.statSync(full);

  if (stat.isDirectory()) {
    return {
      exists:true,
      directory:true
    };
  }

  return {
    exists:true,
    directory:false,
    size:stat.size,
    sha256:sha256(full)
  };
}


console.log("\n=== Phase35 Test vs Astra Compare ===\n");

console.log("TEST:");
console.log(testRoot);

console.log("\nASTRA:");
console.log(astraRoot);

console.log("\n-----------------------------------\n");


for (const file of files) {

  const test = check(testRoot,file);
  const astra = check(astraRoot,file);

  let status="";

  if (!test.exists && !astra.exists) {
    status="NONE";
  }
  else if (test.exists && !astra.exists) {
    status="MISSING_IN_ASTRA";
  }
  else if (!test.exists && astra.exists) {
    status="MISSING_IN_TEST";
  }
  else if (
    test.directory ||
    astra.directory
  ) {
    status="DIRECTORY";
  }
  else if (test.sha256 === astra.sha256) {
    status="SAME";
  }
  else {
    status="DIFFERENT";
  }


  console.log(
`${status.padEnd(22)} ${file}`
  );


  if(status==="DIFFERENT"){
    console.log(
`  TEST : ${test.sha256}
  ASTRA: ${astra.sha256}`
    );
  }

}


console.log("\n=== DATABASE SHA ===");

for (const root of [testRoot, astraRoot]) {

  const db =
    path.join(root,"server","kourosh_inventory.db");

  if(fs.existsSync(db)){
    console.log(
      root,
      sha256(db)
    );
  }
  else{
    console.log(
      root,
      "database missing"
    );
  }

}

console.log("\nDone.\n");