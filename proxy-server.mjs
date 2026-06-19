import http from 'node:http';
import net from 'node:net';
import url from 'node:url';
import { URL } from 'node:url';

const PROXY_HOST = process.env.KOUROSH_PROXY_HOST || '0.0.0.0';
const PROXY_PORT = Number(process.env.KOUROSH_PROXY_PORT || 80);
const VITE_HOST = process.env.KOUROSH_VITE_HOST || '127.0.0.1';
const VITE_PORT = Number(process.env.KOUROSH_VITE_PORT || 5173);
const API_HOST = process.env.KOUROSH_API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.KOUROSH_API_PORT || 3001);

const routeFor = (pathname) => {
  if (pathname === '/health' || pathname.startsWith('/api') || pathname.startsWith('/uploads')) {
    return { host: API_HOST, port: API_PORT };
  }
  return { host: VITE_HOST, port: VITE_PORT };
};

const buildForwardHeaders = (req, targetHost, targetPort) => {
  const headers = { ...req.headers };
  headers.host = `${targetHost}:${targetPort}`;
  headers['x-forwarded-for'] = headers['x-forwarded-for']
    ? `${headers['x-forwarded-for']}, ${req.socket.remoteAddress || ''}`
    : (req.socket.remoteAddress || '');
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = 'http';
  return headers;
};

const proxyHttp = (req, res, targetHost, targetPort) => {
  const proxyReq = http.request({
    host: targetHost,
    port: targetPort,
    method: req.method,
    path: req.url,
    headers: buildForwardHeaders(req, targetHost, targetPort),
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(proxyReq, { end: true });
};

const server = http.createServer((req, res) => {
  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const target = routeFor(parsed.pathname);
    proxyHttp(req, res, target.host, target.port);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Proxy route error: ${err?.message || err}`);
  }
});

server.on('upgrade', (req, socket, head) => {
  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const target = routeFor(parsed.pathname);
    const targetSocket = net.connect(target.port, target.host, () => {
      const headers = { ...req.headers };
      headers.host = `${target.host}:${target.port}`;
      headers.connection = 'Upgrade';
      headers.upgrade = headers.upgrade || 'websocket';
      headers['x-forwarded-for'] = headers['x-forwarded-for']
        ? `${headers['x-forwarded-for']}, ${req.socket.remoteAddress || ''}`
        : (req.socket.remoteAddress || '');
      headers['x-forwarded-host'] = req.headers.host || '';
      headers['x-forwarded-proto'] = 'http';

      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) {
          for (const item of value) lines.push(`${key}: ${item}`);
        } else if (value !== undefined) {
          lines.push(`${key}: ${value}`);
        }
      }
      lines.push('\r\n');
      targetSocket.write(lines.join('\r\n'));
      if (head && head.length) targetSocket.write(head);
      socket.pipe(targetSocket).pipe(socket);
    });

    targetSocket.on('error', (err) => {
      try { socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); } catch {}
      socket.destroy(err);
    });

    socket.on('error', () => {
      targetSocket.destroy();
    });
  } catch (err) {
    try { socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n'); } catch {}
    socket.destroy();
  }
});

server.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log(`✅ Kourosh local reverse proxy listening on http://${PROXY_HOST}:${PROXY_PORT}`);
  console.log(`   -> API    http://${API_HOST}:${API_PORT}`);
  console.log(`   -> Vite   http://${VITE_HOST}:${VITE_PORT}`);
});

server.on('error', (err) => {
  console.error('Proxy server failed to start:', err);
  process.exit(1);
});
