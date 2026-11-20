const $ = (selector) => document.querySelector(selector);

const ui = {
  lobby: $("#lobby-screen"),
  room: $("#room-screen"),
  nickname: $("#nickname"),
  roomCodeInput: $("#room-code"),
  entryError: $("#entry-error"),
  roomCode: $("#room-code-display"),
  roomRole: $("#room-role-label"),
  players: $("#players-list"),
  playerCount: $("#player-count"),
  peerCount: $("#network-peer-count"),
  overallStatus: $("#overall-status"),
  headline: $("#connection-headline"),
  detail: $("#connection-detail"),
  activity: $("#activity-log"),
  sessionTimer: $("#session-timer"),
  shareText: $("#share-text"),
  toast: $("#toast"),
};

const state = {
  ws: null,
  role: null,
  roomCode: "",
  playerId: "",
  hostId: "",
  nickname: "",
  players: [],
  peers: new Map(),
  sessionStarted: null,
  timer: null,
  toastTimer: null,
};

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function send(message) {
  if (state.ws?.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(message));
}

function showError(message) {
  ui.entryError.textContent = message;
  ui.entryError.hidden = false;
}

function clearError() {
  ui.entryError.textContent = "";
  ui.entryError.hidden = true;
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2800);
}

function nowStamp() {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
}

function addLog(message) {
  const line = document.createElement("div");
  line.className = "log-line";
  const time = document.createElement("span");
  time.textContent = nowStamp();
  const content = document.createElement("span");
  content.textContent = message;
  line.append(time, content);
  ui.activity.prepend(line);
  while (ui.activity.children.length > 4) ui.activity.lastElementChild.remove();
}

function getNickname() {
  const nickname = ui.nickname.value.replace(/[<>]/g, "").trim();
  if (nickname.length < 2 || nickname.length > 20) {
    showError("Nickname perlu antara 2 hingga 20 aksara.");
    ui.nickname.focus();
    return null;
  }
  return nickname;
}

function socketUrl() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/signal`;
}

function startSession(action) {
  clearError();
  const nickname = getNickname();
  if (!nickname) return;
  if (action === "join") {
    const code = ui.roomCodeInput.value.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (code.length < 4) {
      showError("Masukkan kod bilik yang sah dahulu.");
      ui.roomCodeInput.focus();
      return;
    }
    ui.roomCodeInput.value = code;
    connectSignal({ type: "join-room", nickname, roomCode: code });
  } else {
    connectSignal({ type: "create-room", nickname });
  }
}

function connectSignal(initialMessage) {
  if (state.ws && state.ws.readyState < WebSocket.CLOSING) state.ws.close();
  state.nickname = initialMessage.nickname;
  const ws = new WebSocket(socketUrl());
  state.ws = ws;
  ws.addEventListener("open", () => {
    send(initialMessage);
    addLog("Signaling server connected.");
  });
  ws.addEventListener("message", async (event) => {
    try {
      await handleServerMessage(JSON.parse(event.data));
    } catch (error) {
      console.error(error);
      addLog("A signaling event could not be processed.");
    }
  });
  ws.addEventListener("error", () => {
    if (state.roomCode) addLog("Signaling connection error.");
    else showError("Tidak dapat menyambung ke signaling server. Cuba lagi.");
  });
  ws.addEventListener("close", () => {
    if (state.roomCode) {
      addLog("Signaling disconnected. Bilik mungkin sudah tidak aktif.");
      setOverallStatus("OFFLINE", "Bilik terputus daripada server signaling.");
    }
  });
}

async function handleServerMessage(message) {
  if (message.type === "error") {
    if (!state.roomCode) showError(message.message || "Permintaan tidak berjaya.");
    else showToast(message.message || "Permintaan tidak berjaya.");
    return;
  }
  if (message.type === "room-created" || message.type === "room-joined") {
    state.role = message.type === "room-created" ? "host" : "peer";
    state.roomCode = message.roomCode;
    state.playerId = message.playerId;
    state.hostId = message.hostId || message.playerId;
    state.players = message.players || [];
    enterRoom();
    addLog(state.role === "host" ? "Bilik baharu berjaya dicipta." : "Berjaya menyertai bilik.");
    return;
  }
  if (message.type === "roster") {
    state.players = message.players || [];
    renderPlayers();
    return;
  }
  if (message.type === "peer-joined") {
    if (state.role === "host") {
      const peer = upsertPeer(message.peerId, message.nickname);
      addLog(`${message.nickname} masuk ke dalam bilik.`);
      await createOffer(peer);
    }
    return;
  }
  if (message.type === "peer-left") {
    const peer = state.peers.get(message.peerId);
    if (peer) addLog(`${peer.nickname} telah keluar.`);
    closePeer(message.peerId);
    return;
  }
  if (message.type === "room-closed") {
    showToast(message.reason || "Bilik telah ditutup.");
    resetToLobby();
    return;
  }
  if (message.type === "signal") {
    await handleSignal(message);
  }
}

function enterRoom() {
  ui.lobby.hidden = true;
  ui.room.hidden = false;
  ui.roomCode.textContent = state.roomCode;
  ui.roomRole.textContent = state.role === "host" ? "HOST" : "PEER";
  ui.shareText.textContent = "Share this code";
  state.sessionStarted = Date.now();
  clearInterval(state.timer);
  state.timer = setInterval(updateSessionTimer, 1000);
  history.replaceState(null, "", `/?room=${encodeURIComponent(state.roomCode)}`);
  renderPlayers();
  setOverallStatus("WAITING", "Menunggu pemain lain menyertai.");
}

function updateSessionTimer() {
  if (!state.sessionStarted) return;
  const elapsed = Math.floor((Date.now() - state.sessionStarted) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  ui.sessionTimer.textContent = `${minutes}:${seconds}`;
}

function setOverallStatus(label, detail) {
  ui.overallStatus.textContent = label;
  ui.overallStatus.className = `status-pill ${label === "CONNECTED" ? "status-connected" : "status-waiting"}`;
  ui.headline.textContent = detail;
  ui.detail.textContent = label === "CONNECTED"
    ? "Data channel direct aktif. Paket ujian bergerak terus dari browser ke browser."
    : "Apabila mereka masuk, sambungan WebRTC akan dinegosiasikan terus dari browser ke browser.";
}

function upsertPeer(id, nickname) {
  let peer = state.peers.get(id);
  if (!peer) {
    peer = { id, nickname, pc: null, channel: null, status: "signaling", pendingIce: [], latency: null };
    state.peers.set(id, peer);
  } else if (nickname) {
    peer.nickname = nickname;
  }
  return peer;
}

function makePeerConnection(peer) {
  if (peer.pc) return peer.pc;
  const pc = new RTCPeerConnection(rtcConfig);
  peer.pc = pc;
  pc.addEventListener("icecandidate", (event) => {
    if (event.candidate) send({ type: "signal", to: peer.id, signalType: "ice-candidate", payload: event.candidate });
  });
  pc.addEventListener("datachannel", (event) => setupDataChannel(peer, event.channel));
  pc.addEventListener("connectionstatechange", () => {
    if (["failed", "closed"].includes(pc.connectionState)) {
      peer.status = "offline";
      renderPlayers();
    }
  });
  return pc;
}

function setupDataChannel(peer, channel) {
  peer.channel = channel;
  channel.addEventListener("open", () => {
    peer.status = "connected";
    channel.send(JSON.stringify({ type: "hello", nickname: state.nickname }));
    addLog(`Direct link aktif dengan ${peer.nickname}.`);
    renderPlayers();
    const connected = [...state.peers.values()].some((item) => item.status === "connected");
    setOverallStatus(connected ? "CONNECTED" : "NEGOTIATING", connected ? "Direct link is live." : "Menyelesaikan handshake WebRTC...");
  });
  channel.addEventListener("close", () => {
    peer.status = "offline";
    renderPlayers();
  });
  channel.addEventListener("message", (event) => handlePeerMessage(peer, event.data));
}

function handlePeerMessage(peer, raw) {
  try {
    const message = JSON.parse(raw);
    if (message.type === "ping") {
      peer.channel?.send(JSON.stringify({ type: "pong", id: message.id, sentAt: message.sentAt }));
    } else if (message.type === "pong") {
      peer.latency = Math.max(0, Date.now() - Number(message.sentAt));
      addLog(`P2P ping ${peer.nickname}: ${peer.latency} ms.`);
      renderPlayers();
    }
  } catch {
    addLog(`Data diterima daripada ${peer.nickname}.`);
  }
}

async function createOffer(peer) {
  const pc = makePeerConnection(peer);
  if (!peer.channel) setupDataChannel(peer, pc.createDataChannel("game-data", { ordered: true }));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  send({ type: "signal", to: peer.id, signalType: "offer", payload: pc.localDescription });
  renderPlayers();
}

async function handleSignal(message) {
  const peer = upsertPeer(message.from, state.players.find((item) => item.id === message.from)?.nickname || "Peer");
  const pc = makePeerConnection(peer);
  if (message.signalType === "offer") {
    await pc.setRemoteDescription(message.payload);
    for (const candidate of peer.pendingIce.splice(0)) await pc.addIceCandidate(candidate);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send({ type: "signal", to: message.from, signalType: "answer", payload: pc.localDescription });
    renderPlayers();
  } else if (message.signalType === "answer") {
    await pc.setRemoteDescription(message.payload);
    for (const candidate of peer.pendingIce.splice(0)) await pc.addIceCandidate(candidate);
  } else if (message.signalType === "ice-candidate" && message.payload) {
    if (pc.remoteDescription) await pc.addIceCandidate(message.payload);
    else peer.pendingIce.push(message.payload);
  }
}

function closePeer(id) {
  const peer = state.peers.get(id);
  if (peer?.pc) peer.pc.close();
  state.peers.delete(id);
  renderPlayers();
  if (![...state.peers.values()].some((item) => item.status === "connected")) setOverallStatus("WAITING", "Menunggu pemain lain menyertai.");
}

function renderPlayers() {
  const players = state.players.length ? state.players : [{ id: state.playerId, nickname: state.nickname, role: state.role }];
  ui.playerCount.textContent = `${players.length} / 8`;
  ui.peerCount.textContent = String(Math.max(0, players.length - 1));
  ui.players.replaceChildren();
  for (const player of players) {
    const row = document.createElement("div");
    row.className = "player-row";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = (player.nickname || "?").slice(0, 2).toUpperCase();
    const meta = document.createElement("div");
    meta.className = "player-meta";
    const name = document.createElement("div");
    name.className = "player-name";
    name.textContent = player.id === state.playerId ? `${player.nickname} (you)` : player.nickname;
    const role = document.createElement("div");
    role.className = "player-role";
    role.textContent = player.role === "host" ? "ROOM HOST" : "PLAYER";
    meta.append(name, role);
    const status = document.createElement("div");
    const peer = state.peers.get(player.id);
    const connected = player.id === state.playerId || peer?.status === "connected";
    status.className = `player-status ${connected ? "is-connected" : ""}`;
    const dot = document.createElement("span");
    dot.className = "pulse-dot";
    const label = document.createElement("span");
    label.textContent = player.id === state.playerId ? "READY" : peer?.latency ? `${peer.latency} MS` : connected ? "DIRECT" : "LINKING";
    status.append(dot, label);
    row.append(avatar, meta, status);
    ui.players.append(row);
  }
}

function pingAll() {
  const activePeers = [...state.peers.values()].filter((peer) => peer.channel?.readyState === "open");
  if (!activePeers.length) {
    showToast("Belum ada direct link yang aktif.");
    addLog("Ping skipped — tiada peer connected.");
    return;
  }
  const sentAt = Date.now();
  const id = `${sentAt}-${Math.random().toString(16).slice(2)}`;
  for (const peer of activePeers) peer.channel.send(JSON.stringify({ type: "ping", id, sentAt }));
  addLog(`Ping packet dihantar kepada ${activePeers.length} peer.`);
}

async function copyRoomCode() {
  try {
    await navigator.clipboard.writeText(state.roomCode);
    ui.shareText.textContent = "Copied to clipboard";
    showToast(`Kod ${state.roomCode} sudah disalin.`);
  } catch {
    showToast(`Kod bilik: ${state.roomCode}`);
  }
}

function resetToLobby() {
  for (const peer of state.peers.values()) peer.pc?.close();
  state.peers.clear();
  state.ws?.close();
  state.ws = null;
  state.roomCode = "";
  state.playerId = "";
  state.hostId = "";
  state.role = null;
  state.players = [];
  clearInterval(state.timer);
  state.sessionStarted = null;
  ui.room.hidden = true;
  ui.lobby.hidden = false;
  ui.roomCodeInput.value = "";
  history.replaceState(null, "", "/");
}

$("#create-room").addEventListener("click", () => startSession("create"));
$("#join-room").addEventListener("click", () => startSession("join"));
$("#copy-room").addEventListener("click", copyRoomCode);
$("#ping-all").addEventListener("click", pingAll);
$("#leave-room").addEventListener("click", () => {
  send({ type: "leave-room" });
  addLog("Anda keluar daripada bilik.");
  resetToLobby();
});
ui.roomCodeInput.addEventListener("input", () => { ui.roomCodeInput.value = ui.roomCodeInput.value.replace(/[^a-z0-9]/gi, "").toUpperCase(); });
ui.nickname.addEventListener("keydown", (event) => { if (event.key === "Enter") startSession("create"); });
ui.roomCodeInput.addEventListener("keydown", (event) => { if (event.key === "Enter") startSession("join"); });

if (!window.RTCPeerConnection) {
  showError("Browser ini tidak menyokong WebRTC. Cuba Chrome, Edge, Firefox atau Safari versi terkini.");
}
const roomFromUrl = new URLSearchParams(location.search).get("room");
if (roomFromUrl) ui.roomCodeInput.value = roomFromUrl.replace(/[^a-z0-9]/gi, "").toUpperCase();
