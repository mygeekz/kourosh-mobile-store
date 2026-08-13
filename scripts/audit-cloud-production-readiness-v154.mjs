import { auditCloudProductionReadiness } from "../cloud/runtime/cloudReadiness.mjs";
const report=auditCloudProductionReadiness(process.env,{environment:"production"});for(const check of report.checks)console.log(`[cloud-production] ${check.status}: ${check.name} — ${check.message}`);console.log(`[cloud-production] ${report.status}`);if(report.status==="FAIL")process.exitCode=1;
