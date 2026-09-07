export const CONNECTIVITY_RUNTIME_BOUNDARIES = Object.freeze({
  backend: { bindHost: "127.0.0.1", port: 3001, publicListener: false },
  localPwa: { defaultPort: 5173, scope: "LAN/local HTTPS runtime" },
  localRedirect: { optionalPorts: [80, 443] as const, scope: "local redirect only" },
  selfHostedMiniAppGateway: { bindHost: "127.0.0.1", port: 4180, scope: "self_hosted public reverse-proxy target" },
  cloudConnector: { outboundOnly: true, tlsPorts: [443] as const, publicListener: false },
});
