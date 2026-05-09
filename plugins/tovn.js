const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
    command: "tovn",
    alias: ["tts", "say"],
    category: "fun",
    description: "Convert text or voice note to VEX bot voice note",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 𝕍𝕆𝕀ℂ𝔼 𝕄𝕆𝔻𝕌𝕃𝔸𝕋𝕆ℝ ☣️",
                line: "━",
                noText: "⚠️ 𝕎ℝ𝕀𝕋𝔼 𝕋𝔼𝕏𝕋 𝕆ℝ ℝ𝔼ℙ𝕃𝕐 𝕋𝕆 𝕄𝔼𝕊𝔸𝔾𝔼/𝕍𝕆𝕀ℂ𝔼",
                usage: `𝕊𝕐ℕ𝕋𝔸𝕏: ${prefix}tovn Hello world\n𝕆ℝ: Reply to message with ${prefix}tovn\n𝕊ℙ𝔼𝔼𝔻: ${prefix}tovn fast|slow|normal text`,
                converting: "☠️ ℂ𝕆ℕ𝕍𝔼ℝ𝕋𝕀ℕ𝔾 𝕋𝕆 𝕍𝔼𝕏 𝕍𝕆𝕀ℂ𝔼...",
                success: "☠️ 𝕍𝔼𝕏 𝕍𝕆𝕀ℂ𝔼 ℝ𝔼𝔸𝔻𝕐",
                fail: "☠️ 𝕍𝕆𝕀ℂ𝔼 𝕄𝕆𝔻𝕌𝕃𝔸𝕋𝕆ℝ 𝔽𝔸𝕀𝕃𝔼𝔻",
                react: "🎙️"
            },
            normal: {
                title: "🎙️ VEX TTS CONVERTER 🎙️",
                line: "─",
                noText: "⚠️ Send text or reply to a message/voice note",
                usage: `Example: ${prefix}tovn Hello there\nOr reply with ${prefix}tovn\nSpeed: ${prefix}tovn fast text`,
                converting: "🔄 Converting to voice note...",
                success: "✅ Voice note ready",
                fail: "❌ TTS conversion failed. Try again",
                react: "🎙️"
            },
            girl: {
                title: "🫧 Voice Maker 🫧",
                line: "┄",
                noText: "🫧 Send text or reply to make voice~ 🫧",
                usage: `🫧 Example: ${prefix}tovn Hi cutie 🫧\n🫧 Speed: ${prefix}tovn slow text 🫧`,
                converting: "🫧 Making cute voice~ 🫧",
                success: "🫧 Voice ready princess~ 🫧",
                fail: "🫧 Oopsie~ Voice failed~ 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let textToConvert = '';
            let speed = 'normal';
            let sourceLang = 'en';

            // 1. Extract text from message or reply
            const quoted = m.quoted? m.quoted : null;
            const fullText = m.text.slice(prefix.length + 4).trim();

            // Check for speed modifier
            if (fullText.startsWith('fast ')) {
                speed = 'fast';
                textToConvert = fullText.slice(5);
            } else if (fullText.startsWith('slow ')) {
                speed = 'slow';
                textToConvert = fullText.slice(5);
            } else if (fullText.startsWith('normal ')) {
                speed = 'normal';
                textToConvert = fullText.slice(7);
            } else {
                textToConvert = fullText;
            }

            // If replying to message
            if (quoted) {
                if (quoted.message?.conversation) {
                    textToConvert = quoted.message.conversation;
                } else if (quoted.message?.extendedTextMessage?.text) {
                    textToConvert = quoted.message.extendedTextMessage.text;
                } else if (quoted.message?.audioMessage) {
                    // If replying to voice note, download and convert
                    const stream = await downloadContentFromMessage(quoted.message.audioMessage, 'audio');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    const id = crypto.randomBytes(6).toString('hex');
                    const inputPath = path.join(tempDir, `in_${id}.ogg`);
                    const outputPath = path.join(tempDir, `out_${id}.ogg`);

                    fs.writeFileSync(inputPath, buffer);

                    // Convert to bot voice using ffmpeg - pitch shift
                    const pitch = style === 'harsh'? 0.8 : style === 'girl'? 1.3 : 1.0;
                    await execPromise(`ffmpeg -i "${inputPath}" -af "asetrate=44100*${pitch},aresample=44100" -c:a libopus -y "${outputPath}"`);

                    const vnBuffer = fs.readFileSync(outputPath);
                    await sock.sendMessage(m.chat, {
                        audio: vnBuffer,
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: true
                    }, { quoted: m });

                    // Cleanup
                    [inputPath, outputPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
                    return;
                }
            }

            if (!textToConvert) {
                const msg = `*${current.title}*\n${current.line.repeat(15)}\n${current.noText}\n\n${current.usage}`;
                return await m.reply(msg);
            }

            // 2. Auto detect language - simple check
            if (/[\u0600-\u06FF]/.test(textToConvert)) sourceLang = 'ar';
            else if (/[\u4E00-\u9FFF]/.test(textToConvert)) sourceLang = 'zh';
            else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(textToConvert)) sourceLang = 'ja';
            else if (/[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/.test(textToConvert)) sourceLang = 'es';
            else sourceLang = 'en';

            await m.reply(`*${current.title}*\n${current.line.repeat(15)}\n${current.converting}`);

            // 3. Generate TTS using Google Translate API
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${sourceLang}&client=tw-ob&q=${encodeURIComponent(textToConvert.slice(0, 200))}`;

            const id = crypto.randomBytes(6).toString('hex');
            const mp3Path = path.join(tempDir, `tts_${id}.mp3`);
            const oggPath = path.join(tempDir, `tts_${id}.ogg`);

            const response = await axios.get(ttsUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            fs.writeFileSync(mp3Path, response.data);

            // 4. Convert to WhatsApp voice note with speed/pitch
            let filter = '';
            if (speed === 'fast') filter = '-filter:a "atempo=1.3"';
            else if (speed === 'slow') filter = '-filter:a "atempo=0.8"';

            // Style-based voice modulation
            if (style === 'harsh') filter += ' -af "asetrate=44100*0.85,aresample=44100"';
            else if (style === 'girl') filter += ' -af "asetrate=44100*1.2,aresample=44100"';

            await execPromise(`ffmpeg -i "${mp3Path}" ${filter} -c:a libopus -b:a 64k -y "${oggPath}"`);

            const vnBuffer = fs.readFileSync(oggPath);

            // 5. Send voice note
            await sock.sendMessage(m.chat, {
                audio: vnBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
                contextInfo: {
                    externalAdReply: {
                        title: current.success,
                        body: `Speed: ${speed} | Lang: ${sourceLang.toUpperCase()}`,
                        thumbnail: null,
                        mediaType: 2
                    }
                }
            }, { quoted: m });

            // 6. Cleanup
            [mp3Path, oggPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));

        } catch (error) {
            console.error("VEX TOVN ERROR:", error);
            const errorMsg = `*${current.title}*\n${current.line.repeat(15)}\n${current.fail}`;
            await m.reply(errorMsg);
        }
    }
};
