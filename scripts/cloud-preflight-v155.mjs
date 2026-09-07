import { runCloudPreflight } from "../cloud/runtime/cloudPreflight.mjs";
const report=runCloudPreflight(process.env);for(const check of report.checks)console.log(`[cloud-preflight] ${check.status}: ${check.name} — ${check.message}`);console.log(`[cloud-preflight] ${report.pilotReadiness}`);if(report.status==="FAIL")process.exitCode=1;
