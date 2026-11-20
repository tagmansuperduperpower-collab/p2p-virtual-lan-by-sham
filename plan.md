# P2P Virtual LAN by Sham — Pelan Produk

## Arah produk

P2P Virtual LAN by Sham ialah ruang permainan multiplayer tanpa akaun. Seorang pemain mencipta bilik dan menerima kod pendek; pemain lain memasukkan kod serta nama panggilan sementara. Server hanya menjadi lapisan signaling untuk pertukaran WebRTC offer, answer dan ICE candidate. Selepas handshake, data permainan bergerak terus antara pelayar dan host melalui WebRTC DataChannel.

MVP ini memfokuskan pengalaman yang cepat dan jelas: masuk tanpa pendaftaran, kod bilik yang mudah disalin, senarai pemain masa nyata, status sambungan, dan ujian ping P2P. Ia menjadi asas untuk adapter paket permainan pada fasa seterusnya.

## Keputusan teknikal

- **Frontend:** HTML, CSS dan JavaScript browser tanpa framework supaya bundle kecil dan boleh di-embed dengan mudah.
- **Backend:** Node.js, Express dan `ws`. Express menyajikan frontend serta `/health`; WebSocket menyelenggara bilik sementara dalam memori.
- **Transport:** WebRTC DataChannel dengan host sebagai peer utama. Signaling menggunakan WebSocket; server tidak menyimpan akaun atau data bilik selepas proses tamat.
- **Topologi MVP:** setiap pemain menyambung terus kepada host. Host mengekalkan satu `RTCPeerConnection` bagi setiap peer yang menyertai.
- **Privasi:** hanya nama panggilan sementara dan kod bilik diperlukan. Tiada login, password atau pangkalan data.
- **Reka bentuk:** Neon LAN Arcade — latar navy gelap, panel berlapis, cyan sebagai warna tindakan/sambungan, lime sebagai isyarat berjaya, dan tipografi Space Grotesk.

## Struktur projek

- `server.js` — server HTTP, static assets, WebSocket signaling, lifecycle bilik dan health check.
- `public/index.html` — dua skrin utama: masuk dan bilik.
- `public/styles.css` — sistem visual responsif dan komponen status.
- `public/app.js` — state UI, client WebSocket, WebRTC peer connections, roster dan ping test.
- `public/manus-routes.json` — manifest route frontend untuk Preview.
- `TODO.md` — outcome kerja dan status acceptance.

## Aliran utama

1. Pemain mengisi nickname lalu memilih **Cipta bilik** atau memasukkan kod dan memilih **Sertai bilik**.
2. Client membuka WebSocket signaling. Host menerima kod unik; peer yang menyertai menerima roster.
3. Host membuat offer dan DataChannel untuk setiap peer baharu. Peer menjawab offer; kedua-dua pihak bertukar ICE candidate.
4. Roster signaling dikekalkan sebagai gambaran bilik, manakala badge hijau hanya muncul apabila DataChannel benar-benar terbuka.
5. Butang **Uji sambungan** menghantar paket ping melalui DataChannel dan memaparkan latency setiap peer.
6. Keluar bilik atau websocket disconnect membersihkan peer connection dan memaklumkan pemain lain.

## Had MVP dan sambungan seterusnya

MVP ini menyediakan virtual LAN pada lapisan aplikasi browser, bukan adapter rangkaian OS yang boleh memintas trafik UDP/TCP untuk semua permainan desktop. Fasa seterusnya boleh menambah protokol paket permainan khusus, TURN server untuk rangkaian yang sukar melakukan NAT traversal, reconnect, room expiry yang lebih ketat, dan client desktop/native jika permainan sasaran memerlukannya.
