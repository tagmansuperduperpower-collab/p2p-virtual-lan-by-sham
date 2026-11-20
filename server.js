import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/signal" });
const rooms = new Map();
const MAX_PLAYERS = 8;
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "p2p-virtual-lan-by-sham", rooms: rooms.size });
});
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from(randomBytes(4), (byte) => alphabet[byte % alphabet.length]).join("");
  } while (rooms.has(code));
  return code;
}

function makePlayerId() {
  return randomBytes(5).toString("hex");
}

function cleanNickname(value) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, 20);
}

function roster(room) {
  return [...room.players.values()].map(({ id, nickname, role }) => ({ id, nickname, role }));
}

function broadcastRoster(room) {
  const players = roster(room);
  for (const player of room.players.values()) send(player.ws, { type: "roster", players });
}

function removeFromRoom(ws, reason = "left") {
  const roomCode = ws.roomCode;
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  ws.roomCode = null;
  if (!room) return;

  const player = room.players.get(ws.playerId);
  room.players.delete(ws.playerId);

  if (player?.role === "host") {
    for (const peer of room.players.values()) {
      send(peer.ws, { type: "room-closed", reason: "Host telah keluar. Bilik ditutup." });
      peer.ws.roomCode = null;
    }
    room.players.clear();
    rooms.delete(roomCode);
    return;
  }

  if (room.host) send(room.host.ws, { type: "peer-left", peerId: ws.playerId, reason });
  broadcastRoster(room);
}

function parseMessage(raw) {
  try {
    const value = JSON.parse(raw.toString());
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.playerId = null;

  ws.on("message", (raw) => {
    const message = parseMessage(raw);
    if (!message?.type) return;

    if (message.type === "create-room") {
      if (ws.roomCode) removeFromRoom(ws);
      const nickname = cleanNickname(message.nickname);
      if (nickname.length < 2) return send(ws, { type: "error", code: "INVALID_NICKNAME", message: "Nickname perlu 2 hingga 20 aksara." });
      const roomCode = makeRoomCode();
      const playerId = makePlayerId();
      const player = { id: playerId, nickname, role: "host", ws };
      const room = { code: roomCode, host: player, players: new Map([[playerId, player]]) };
      rooms.set(roomCode, room);
      ws.roomCode = roomCode;
      ws.playerId = playerId;
      send(ws, { type: "room-created", roomCode, playerId, players: roster(room) });
      return;
    }

    if (message.type === "join-room") {
      if (ws.roomCode) removeFromRoom(ws);
      const nickname = cleanNickname(message.nickname);
      const roomCode = String(message.roomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      const room = rooms.get(roomCode);
      if (nickname.length < 2) return send(ws, { type: "error", code: "INVALID_NICKNAME", message: "Nickname perlu 2 hingga 20 aksara." });
      if (!room) return send(ws, { type: "error", code: "ROOM_NOT_FOUND", message: "Bilik tidak ditemui. Semak semula kod bilik." });
      if (room.players.size >= MAX_PLAYERS) return send(ws, { type: "error", code: "ROOM_FULL", message: "Bilik ini sudah penuh." });

      const playerId = makePlayerId();
      const player = { id: playerId, nickname, role: "peer", ws };
      room.players.set(playerId, player);
      ws.roomCode = roomCode;
      ws.playerId = playerId;
      send(ws, { type: "room-joined", roomCode, playerId, hostId: room.host.id, players: roster(room) });
      send(room.host.ws, { type: "peer-joined", peerId: playerId, nickname });
      broadcastRoster(room);
      return;
    }

    if (message.type === "signal") {
      const room = rooms.get(ws.roomCode);
      const target = room?.players.get(String(message.to || ""));
      if (!target || !message.signalType) return;
      send(target.ws, {
        type: "signal",
        from: ws.playerId,
        signalType: message.signalType,
        payload: message.payload,
      });
      return;
    }

    if (message.type === "leave-room") removeFromRoom(ws, "left");
  });

  ws.on("close", () => removeFromRoom(ws, "disconnected"));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`P2P Virtual LAN by Sham listening on port ${PORT}`);
});
