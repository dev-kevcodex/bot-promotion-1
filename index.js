const { default: makeWASocket, delay, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');
const express = require('express');
const qrcode = require('qrcode');
const pino = require('pino');

const firebaseConfig = {
    apiKey: "AIzaSyAyrjEdJfN2ynhv1MMG2mTcmKIPvNlXNqE",
    authDomain: "flowskev-nodev-one.firebaseapp.com",
    projectId: "flowskev-nodev-one",
    databaseURL: "https://flowskev-nodev-one-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "flowskev-nodev-one.firebasestorage.app",
    messagingSenderId: "41973213374",
    appId: "1:41973213374:web:0db14f394bf31a644e56ef"
};

const appFb = initializeApp(firebaseConfig);
const db = getDatabase(appFb, firebaseConfig.databaseURL);
const app = express();
let qrCodeData = '';

async function startBot() {
    // Membaca Creds dari Firebase sebelum membuat socket
    const credsSnap = await get(ref(db, 'whatsapp_session/creds'));
    const creds = credsSnap.val() || { registrationId: Math.floor(Math.random() * 10000) };

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: {
            creds: creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const snap = await get(ref(db, `whatsapp_session/${type}/${id}`));
                        data[id] = snap.val();
                    }
                    return data;
                },
                set: async (data) => {
                    for (const type in data) {
                        for (const id in data[type]) {
                            await set(ref(db, `whatsapp_session/${type}/${id}`), data[type][id]);
                        }
                    }
                }
            }
        },
        browser: ['Flowskev Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', async () => {
        await set(ref(db, 'whatsapp_session/creds'), sock.authState.creds);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) qrCodeData = await qrcode.toDataURL(qr);
        if (connection === 'open') {
            console.log('Terhubung! Memulai broadcast...');
            await runBroadcast(sock);
        }
    });
}

async function runBroadcast(sock) {
    const groups = await sock.groupFetchAllParticipating();
    const groupJids = Object.keys(groups);

    for (const jid of groupJids) {
        try {
            await sock.sendPresenceUpdate('composing', jid);
            await delay(3000); 

            const text = `♜ Flowskev information ❪ ♢ ❫\n╰┈ⓘ Turning Complex Logic into Digital Reality.\n\n⟢━━❪ 📊 ɪɴꜰᴏ ꜱᴛᴀᴛᴜꜱ ❫━━⟣\n\n▷ 🛠 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗺𝗲𝗻𝘁: Custom Web & Apps\n▷ 🥞 𝗛𝗼𝘀𝘁𝗶𝗻𝗴 & 𝗗𝗲𝗽𝗹𝗼𝘆: High Performance\n\n#𝗦𝗛𝗔𝗥𝗘 𝗟𝗜𝗡𝗞 𝗔𝗥𝗘𝗔:\nhttps://chat.whatsapp.com/LA4c8ai2pVW17aeXfjJ8WS?s=cl&p=a&mlu=3`;

            const msg = generateWAMessageFromContent(jid, {
                viewOnceMessage: { message: { interactiveMessage: {
                    body: { text: text },
                    header: { hasMediaAttachment: true, imageMessage: await sock.prepareMessageMedia({ url: 'https://flowskev.duckdns.org/images/grup/thumb.png' }, 'imageMessage') },
                    nativeFlowMessage: { buttons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "𝗠𝗢𝗥𝗘 𝗜𝗡𝗙𝗢", url: "https://flowskev.duckdns.org" }) }] }
                }}}
            }, {});

            await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
            console.log(`Sukses ke: ${groups[jid].subject}`);
            await delay(300000); // 5 menit per grup
        } catch (e) { console.log(`Gagal: ${e.message}`); }
    }
    process.exit(0);
}

app.get('/', (req, res) => {
    res.send(qrCodeData ? `<img src="${qrCodeData}" /><h1>Scan QR</h1>` : '<h1>Menunggu koneksi...</h1>');
});

app.listen(3000, () => console.log('Web QR: http://localhost:3000'));
startBot();
