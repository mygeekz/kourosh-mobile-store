import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const encodeFrame = (opcode, payload = Buffer.alloc(0)) => {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), "utf8");
  let header;
  if (body.length < 126) {
    header = Buffer.alloc(2); header[0] = 0x80 | opcode; header[1] = body.length;
  } else if (body.length <= 0xffff) {
    header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(body.length, 2);
  } else {
    header = Buffer.alloc(10); header[0] = 0x80 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  return Buffer.concat([header, body]);
};

export class SimpleWebSocketConnection extends EventEmitter {
  #buffer = Buffer.alloc(0);
  #closed = false;
  #maxFrameBytes;
  constructor(socket, maxFrameBytes) {
    super(); this.socket = socket; this.#maxFrameBytes = maxFrameBytes;
    socket.on("data", (chunk) => this.#consume(chunk));
    socket.on("close", () => { if (!this.#closed) { this.#closed = true; this.emit("close"); } });
    socket.on("error", (error) => this.emit("error", error));
  }
  send(text) {
    if (this.#closed) return false;
    const body = Buffer.isBuffer(text) ? text : Buffer.from(String(text), "utf8");
    if (body.length > this.#maxFrameBytes) {
      const error = Object.assign(new Error("Outbound WebSocket frame exceeds configured limit."), { code: "WS_OUTBOUND_FRAME_TOO_LARGE", size: body.length, limit: this.#maxFrameBytes });
      this.emit("send_rejected", error);
      return false;
    }
    this.socket.write(encodeFrame(0x1, body));
    return true;
  }
  ping(payload = "") { if (!this.#closed) this.socket.write(encodeFrame(0x9, payload)); }
  close(code = 1000, reason = "") {
    if (this.#closed) return;
    this.#closed = true;
    const reasonBytes = Buffer.from(String(reason).slice(0, 120), "utf8");
    const body = Buffer.alloc(2 + reasonBytes.length); body.writeUInt16BE(code, 0); reasonBytes.copy(body, 2);
    try { this.socket.write(encodeFrame(0x8, body)); } catch {}
    try { this.socket.end(); } catch {}
    this.emit("close", code, reason);
  }
  #consume(chunk) {
    if (this.#closed) return;
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    while (this.#buffer.length >= 2) {
      const first = this.#buffer[0]; const second = this.#buffer[1];
      const fin = Boolean(first & 0x80); const opcode = first & 0x0f; const masked = Boolean(second & 0x80);
      if (!fin || !masked) return this.close(1002, "unsupported frame");
      let length = second & 0x7f; let offset = 2;
      if (length === 126) { if (this.#buffer.length < 4) return; length = this.#buffer.readUInt16BE(2); offset = 4; }
      else if (length === 127) {
        if (this.#buffer.length < 10) return;
        const big = this.#buffer.readBigUInt64BE(2); if (big > BigInt(Number.MAX_SAFE_INTEGER)) return this.close(1009, "frame too large");
        length = Number(big); offset = 10;
      }
      if (length > this.#maxFrameBytes) return this.close(1009, "frame too large");
      const total = offset + 4 + length; if (this.#buffer.length < total) return;
      const mask = this.#buffer.subarray(offset, offset + 4); offset += 4;
      const payload = Buffer.from(this.#buffer.subarray(offset, offset + length)); this.#buffer = this.#buffer.subarray(total);
      for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
      if (opcode === 0x1) this.emit("message", payload.toString("utf8"));
      else if (opcode === 0x8) return this.close(1000, "peer closed");
      else if (opcode === 0x9) this.socket.write(encodeFrame(0xA, payload));
      else if (opcode === 0xA) this.emit("pong");
      else return this.close(1003, "unsupported opcode");
    }
  }
}

export const acceptWebSocketUpgrade = (req, socket, head, { maxFrameBytes = 12 * 1024 * 1024 } = {}) => {
  const upgrade = String(req.headers.upgrade || "").toLowerCase();
  const connection = String(req.headers.connection || "").toLowerCase();
  const key = String(req.headers["sec-websocket-key"] || "").trim();
  const version = String(req.headers["sec-websocket-version"] || "").trim();
  if (upgrade !== "websocket" || !connection.includes("upgrade") || version !== "13" || !/^[A-Za-z0-9+/]{22}==$/.test(key)) {
    socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n"); socket.destroy(); return null;
  }
  const accept = crypto.createHash("sha1").update(key + WS_GUID).digest("base64");
  socket.write(["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${accept}`, "", ""].join("\r\n"));
  const ws = new SimpleWebSocketConnection(socket, maxFrameBytes);
  if (head?.length) socket.unshift(head);
  return ws;
};
