import { BoundedWindowRateLimiter } from "../relay-server/securityLimits.mjs";
import { requireDnsHostname } from "../shared/cloudHostname.mjs";
import { assertCloudMutationRuntimeSupported } from "../runtime/cloudProductionConfig.mjs";

const readBody = (req, limit) => new Promise((resolve,reject)=>{const chunks=[];let size=0,done=false;req.on("data",c=>{if(done)return;size+=c.length;if(size>limit){done=true;reject(Object.assign(new Error("BODY_TOO_LARGE"),{code:"BODY_TOO_LARGE"}));req.destroy();}else chunks.push(c);});req.on("end",()=>{if(!done)resolve(Buffer.concat(chunks));});req.on("error",reject);});
const securityHeaders={"cache-control":"no-store","pragma":"no-cache","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()","content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
const json=(res,status,body)=>{const payload=Buffer.from(JSON.stringify(body));res.writeHead(status,{...securityHeaders,"content-type":"application/json; charset=utf-8","content-length":payload.length});res.end(payload);};
const normalizeHost=(value)=>String(value||"").trim().toLowerCase().replace(/:\d+$/,"");

export const createControlPlaneHttpHandler = (options={}) => {
  const registry=options.registry; if(!registry||typeof registry.enrollTenant!=="function")throw new Error("Persistent Control Plane registry required.");
  const environment=String(options.environment||"production");
  const baseDomain=String(options.publicBaseDomain||"").trim().toLowerCase();if(!baseDomain)throw new Error("publicBaseDomain is required.");
  const connectorEndpoint=String(options.connectorEndpoint||"").trim();if(!connectorEndpoint)throw new Error("connectorEndpoint is required.");
  const rawControlHost=String(options.controlHost||"").trim().toLowerCase();
  if(environment==="production"&&!rawControlHost)throw new Error("controlHost is required in production.");
  const controlHost=rawControlHost?requireDnsHostname(rawControlHost,{allowSingleLabel:["test","development"].includes(environment)}):"";
  const limiter=new BoundedWindowRateLimiter({windowMs:60_000,maxAttempts:Number(options.maxAttemptsPerMinute||10),maxEntries:Number(options.maxRateLimiterEntries||4096)});
  const log=options.log||(()=>{});
  const assertMutationRuntimeSupported=typeof options.assertMutationRuntimeSupported==="function"?options.assertMutationRuntimeSupported:(()=>assertCloudMutationRuntimeSupported(environment));
  return async(req,res,context={})=>{
    let pathname="/";try{pathname=new URL(req.url||"/","http://control.invalid").pathname;}catch{}
    if(controlHost&&normalizeHost(req.headers.host)!==controlHost){log("control_host_rejected",{reason:"host_mismatch"});return json(res,404,{success:false,code:"CONTROL_NOT_FOUND"});}
    if(req.headers.origin||req.headers.cookie){return json(res,400,{success:false,code:"CONTROL_BROWSER_CONTEXT_REJECTED"});}
    const clientKey=String(context.clientIp||req.socket.remoteAddress||"unknown").slice(0,128);const rate=limiter.check(clientKey);
    if(!rate.allowed)return json(res,429,{success:false,code:"CONTROL_RATE_LIMITED",message:"Too many control-plane attempts."});
    if(!["/control/v1/enroll","/control/v1/rotate"].includes(pathname)||req.method!=="POST")return json(res,404,{success:false,code:"CONTROL_NOT_FOUND"});
    try{
      const body=await readBody(req,64*1024);const input=JSON.parse(body.toString("utf8"));
      const installationId=String(input.installationId||"").trim();const publicKeyPem=String(input.publicKeyPem||"");
      if(publicKeyPem.length>8192||String(input.enrollmentCode||input.recoveryCode||"").length>256)throw Object.assign(new Error("Control payload rejected."),{code:"CONTROL_PAYLOAD_INVALID"});
      assertMutationRuntimeSupported();
      if(pathname==="/control/v1/enroll"){
        const result=await registry.enrollTenant({installationId,publicKeyPem,enrollmentCode:String(input.enrollmentCode||""),baseDomain,connectorEndpoint});
        log("tenant_enrolled",{installationId,assignedStoreId:result.assignedStoreId});
        return json(res,201,{success:true,data:{assignedStoreId:result.assignedStoreId,assignedPublicUrl:result.assignedPublicUrl,connectorEndpoint:result.connectorEndpoint,protocolVersion:result.protocolVersion,assignmentVersion:result.assignmentVersion||1}});
      }
      const result=await registry.rotateTenantKey({installationId,publicKeyPem,recoveryCode:String(input.recoveryCode||"")});
      log("tenant_key_rotated",{installationId,assignedStoreId:result.assignedStoreId,credentialVersion:result.credentialVersion});
      return json(res,200,{success:true,data:{assignedStoreId:result.assignedStoreId,assignedPublicUrl:result.assignedPublicUrl,connectorEndpoint,protocolVersion:1,credentialVersion:result.credentialVersion,assignmentVersion:result.assignmentVersion||1}});
    }catch(error){
      const code=String(error?.code||"CONTROL_REQUEST_REJECTED");const status=code==="BODY_TOO_LARGE"||code==="CONTROL_PAYLOAD_INVALID"?413:["ENROLLMENT_CODE_INVALID","ENROLLMENT_CODE_USED","ENROLLMENT_CODE_EXPIRED","ENROLLMENT_ATTEMPTS_EXCEEDED","PUBLIC_KEY_INVALID","INSTALLATION_ID_INVALID"].includes(code)?400:code==="TENANT_EXISTS"?409:400;
      log("control_request_rejected",{reason:code});return json(res,status,{success:false,code,message:"Control-plane request rejected."});
    }
  };
};
