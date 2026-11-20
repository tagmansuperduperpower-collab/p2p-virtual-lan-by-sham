# P2P Virtual LAN by Sham

Ruang multiplayer peer-to-peer untuk gaming tanpa akaun. Pemain mencipta atau menyertai bilik menggunakan kod ringkas, kemudian bertukar data secara terus melalui WebRTC DataChannel. Server hanya digunakan untuk signaling dan tidak menyimpan akaun atau pangkalan data.

## Jalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` dalam dua tab atau dua peranti. Cipta bilik pada satu tab, salin kod, kemudian sertai dari tab kedua.

## Cara kerja

Host membuka satu WebRTC connection untuk setiap peer yang menyertai. WebSocket signaling menukar offer, answer dan ICE candidate sahaja. Selepas saluran dibuka, butang **Uji sambungan** menghantar ping terus melalui DataChannel.

## Nota production

MVP ini ialah virtual LAN pada lapisan aplikasi browser. Ia belum menjadi adapter OS yang membawa trafik TCP/UDP sebarang permainan desktop. TURN server, reconnect automatik, room expiry dan adapter paket permainan khusus ialah langkah hardening seterusnya.
