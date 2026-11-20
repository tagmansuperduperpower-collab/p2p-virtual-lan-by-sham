# P2P Virtual LAN by Sham — TODO

## Outcome 1 — Masuk tanpa akaun dan nickname sementara

- [x] Pengguna boleh membuka aplikasi tanpa login, password atau pendaftaran.
- [x] Pengguna boleh memasukkan nickname sementara 2–20 aksara.
- [x] Antara muka menerangkan bahawa tiada akaun diperlukan dan data bilik adalah sementara.

## Outcome 2 — Cipta atau sertai bilik melalui kod ringkas

- [x] Pengguna boleh mencipta bilik permainan dengan satu tindakan dan menerima kod unik.
- [x] Pengguna boleh menyertai bilik sedia ada dengan memasukkan kod 4–6 aksara.
- [x] Kod bilik boleh disalin menggunakan tindakan khusus.
- [x] Kod tidak sensitif huruf besar/kecil dan input disanitasi.
- [x] Bilik penuh, kod tidak wujud dan nickname tidak sah dipaparkan sebagai mesej yang boleh difahami.

## Outcome 3 — Signaling dan WebRTC DataChannel P2P

- [x] Server signaling ringan menyokong pertukaran offer, answer dan ICE candidate.
- [x] Host membuka DataChannel terus kepada setiap peer yang menyertai.
- [x] Peer menjawab offer dan menandakan saluran sebagai connected hanya selepas DataChannel terbuka.
- [x] Disconnect dan leave room membersihkan peer connection serta memberitahu roster.
- [ ] Tambah TURN fallback untuk rangkaian NAT yang tidak dapat melakukan direct traversal.

## Outcome 4 — Paparan bilik dan status pemain masa nyata

- [x] Bilik memaparkan kod, peranan host, jumlah pemain dan senarai nickname.
- [x] Setiap pemain mempunyai status signaling dan status P2P yang jelas.
- [x] Aplikasi menyediakan tindakan keluar bilik.
- [x] Aplikasi memaparkan log ringkas aktiviti bilik tanpa mendedahkan data sensitif.

## Outcome 5 — Ujian pengalaman gaming P2P

- [x] Butang Uji sambungan menghantar ping melalui DataChannel.
- [x] Latency P2P dipaparkan bagi peer yang berjaya menjawab.
- [x] Health endpoint tersedia untuk hosting dan diagnostik.
- [x] Route manifest tersedia di `/manus-routes.json`.
- [ ] Tambah adapter paket permainan khusus selepas permainan sasaran dipilih.
- [ ] Tambah reconnect automatik dan pilihan TURN server untuk production hardening.
