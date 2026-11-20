# Bug and error audit

## Fixed in this iteration

1. **Express 5 startup crash.** `app.get("*")` menggunakan wildcard lama yang menyebabkan `PathError: Missing parameter name`. Ia ditukar kepada fallback `app.use(...)`; server kini listen pada port 3000 dan health check lulus.
2. **Android signaling origin.** Web app asal menggunakan `location.host`, yang akan menjadi `capacitor://localhost` jika dibungkus secara native. Capacitor Android kini memuat URL HTTPS Preview yang sama dengan server signaling, supaya WebSocket menjadi `wss://.../signal` dan tidak gagal kerana origin tempatan.
3. **UI wording.** Label `WebRTC direct` dibuang daripada feature strip seperti diminta.
4. **Toolchain gap.** JDK compiler, Android SDK dan Gradle tidak tersedia pada awal audit. JDK 21, Android command-line tools, platform 36 dan Gradle wrapper telah disediakan untuk build.

## Verified

- WebSocket create/join/roster test: passed.
- HTTPS health endpoint: passed.
- WSS signaling handshake: passed.
- Capacitor Doctor: Android looking great.
- Debug APK build: passed.
- APK manifest and zip integrity: passed.
- `node --check` untuk server dan browser client: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.

## Known release risks

- APK ini ialah debug build, bukan release-signed APK.
- Signaling masih menggunakan Preview URL. Production perlu domain kekal dan backend yang sentiasa hidup.
- WebRTC mungkin memerlukan TURN server pada sesetengah rangkaian NAT.
- Wrapper ini membungkus client browser; ia belum menjadi network adapter OS untuk semua permainan desktop.
