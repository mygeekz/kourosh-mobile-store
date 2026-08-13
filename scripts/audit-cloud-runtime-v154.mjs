import { auditCloudRuntime } from "../cloud/runtime/cloudReadiness.mjs";
const environment=process.argv.includes("--development")?"development":process.argv.includes("--test")?"test":String(process.env.NODE_ENV||"production");
const report=auditCloudRuntime(process.env,{environment});for(const check of report.checks)console.log(`[cloud-runtime] ${check.status}: ${check.name} — ${check.message}`);console.log(`[cloud-runtime] ${report.status}`);if(report.status==="FAIL")process.exitCode=1;
