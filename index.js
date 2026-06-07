const { default: makeWASocket, delay, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const admin = require('firebase-admin');
const express = require('express');
const qrcode = require('qrcode');
const pino = require('pino');
const serviceAccount = require('./serviceAccountKey.json');

// Inisialisasi Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://bot-promosi-default-rtdb.firebaseio.com"
});
const db = admin.database();

const app = express();
let qrCodeData = '';

// Custom Auth Store untuk Firebase
const useFirebaseAuthState = (dbRef) => {
    const writeData = async (data, key) => {
        await dbRef.child(key).set(JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
    };
    const readData = async (key) => {
        const snapshot = await dbRef.child(key).once('value');
        return snapshot.val();
    };

    return {
        state: {
            creds: await readData('creds') || { registrationId: Math.floor(Math.random() * 10000) },
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) data[id] = await readData(`${type}/${id}`);
                    return data;
                },
                set: async (data) => {
                    for (const type in data) for (const id in data[type]) await writeData(data[type][id], `${type}/${id}`);
                }
            }
        },
        saveCreds: () => writeData(state.creds, 'creds')
    };
};

async function startBot() {
    const { state, saveCreds } = await useFirebaseAuthState(db.ref('whatsapp_session'));
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['Flowskev Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

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
            await delay(Math.floor(Math.random() * (5000 - 2000) + 2000));

            const textContent = `♜ Flowskev information ❪ ♢ ❫\n╰┈ⓘ Turning Complex Logic into Digital Reality.\n\n⟢━━❪ 📊 ɪɴғᴏ sᴛᴀᴛᴜs ❫━━⟣\n\n▷ 🛠 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗺𝗲𝗻𝘁: Custom Web & Apps\n▷ 🥞 𝗛𝗼𝘀𝘁𝗶𝗻𝗴 & 𝗗𝗲𝗽𝗹𝗼𝘆: High Performance\n\n#𝗦𝗛𝗔𝗥𝗘 𝗟𝗜𝗡𝗞 𝗔𝗥𝗘𝗔:\nhttps://chat.whatsapp.com/LA4c8ai2pVW17aeXfjJ8WS?s=cl&p=a&mlu=3`;

            const msg = generateWAMessageFromContent(jid, {
                viewOnceMessage: { message: { interactiveMessage: {
                    body: { text: textContent },
                    header: { hasMediaAttachment: true, imageMessage: await sock.prepareMessageMedia({ url: 'https://flowskev.duckdns.org/images/grup/thumb.png' }, 'imageMessage') },
                    nativeFlowMessage: { buttons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "𝗠𝗢𝗥𝗘 𝗜𝗡𝗙𝗢", url: "https://flowskev.duckdns.org" }) }] }
                }}}
            }, {});

            await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
            console.log(`Sukses ke: ${groups[jid].subject}`);
            await delay(Math.floor(Math.random() * (600000 - 300000) + 300000)); // Delay 5-10 menit
        } catch (e) { console.log(`Gagal: ${e.message}`); }
    }
    console.log('Broadcast selesai. Menutup sistem.');
    process.exit(0);
}

app.get('/', (req, res) => {
    res.send(qrCodeData ? `<img src="${qrCodeData}" /><h1>Scan untuk menautkan perangkat</h1>` : '<h1>Menunggu koneksi...</h1>');
});

app.listen(3000, () => console.log('Web QR aktif di port 3000'));
startBot();
