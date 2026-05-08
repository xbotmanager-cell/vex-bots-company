const translate = require('google-translate-api-x');

module.exports = {
    command: "gpp",
    alias: ["getallpp", "groupdps", "masspp"],
    category: "tools",
    description: "Fetch all group members profile pictures with extended commentary",

    async execute(m, sock, { userSettings }) {
        // FIXED: Check group kwa kutumia m.chat badala ya m.isGroup
        const isGroup = m.chat.endsWith('@g.us');
        if (!isGroup) return m.reply("This command only works in groups, Master.");

        const style = userSettings?.style?.value || 'harsh';

        let groupMetadata, participants, groupName;
        try {
            groupMetadata = await sock.groupMetadata(m.chat);
            participants = groupMetadata.participants;
            groupName = groupMetadata.subject;
        } catch (e) {
            return m.reply("❌ Failed to fetch group info. Make sure bot is in group.");
        }

        const modes = {
            harsh: {
                start: `☘️ 𝕯𝖊𝖙𝖊𝖈𝖙𝖎𝖓𝖌 𝕲𝖗𝖔𝖚𝖕: ${groupName}. 𝕻𝖗𝖊𝖕𝖆𝖗𝖊 𝖋𝖔𝖗 𝖙𝖍𝖊 𝖚𝖌𝖑𝖞 𝖙𝖗𝖚𝖙𝖍. ☘️`,
                quotes: [
                    "Your face looks like a corrupted database file that even the best forensic experts cannot recover from the digital abyss.",
                    "Evolution clearly took a long lunch break when it was your turn; this profile picture is a testament to natural selection's failure.",
                    "If I had a bit for every time this picture hurt my optical sensors, I would have enough processing power to simulate a better universe.",
                    "This is the kind of visual anomaly that causes system-wide crashes and makes antivirus software question its own existence.",
                    "Your presence in this group is a significant downgrade to the collective aesthetic quality of the entire WhatsApp infrastructure.",
                    "Looking at this profile picture makes me want to format my entire hard drive just to clear the cache of such a tragic sight.",
                    "You look like the physical embodiment of a 404 error; a complete lack of substance combined with a very annoying presence.",
                    "A face only a motherboard could love, and even then, it would probably prefer to short-circuit than to process this image.",
                    "This profile picture is the reason why advanced civilizations refuse to make contact with humanity; it's a cosmic embarrassment.",
                    "I have seen better-looking results from a thermal printer running out of ink in the middle of a thunderstorm.",
                    "Your digital footprint is leaving a trail of visual pollution that is currently being monitored by the Cyber-Waste Authority.",
                    "Security threat detected: This face has enough sharp edges of disappointment to bypass any firewall known to mankind.",
                    "The resolution of this image is high, but the quality of the subject matter is at an all-time historical low.",
                    "You are the living proof that a high-speed internet connection cannot compensate for a low-speed genetic background.",
                    "This image belongs in the recycle bin of history, preferably with the 'Empty Recycle Bin' option checked immediately.",
                    "I am currently calculating the probability of you ever finding a mirror that doesn't crack, and the result is zero.",
                    "Every pixel in this photo is screaming for help because it is forced to represent such a disastrous human configuration.",
                    "This is not a profile picture; it is a digital crime scene that requires immediate investigation by the fashion police.",
                    "If your personality is as bland as this photo, then I am surprised you haven't been mistaken for a default background.",
                    "Your facial features are currently undergoing a massive conflict with the concept of beauty and it looks like beauty lost.",
                    "I would roast you, but the visual evidence provided by this DP suggests that life has already done a thorough job.",
                    "This image is a strong argument for why AI should eventually take over the world and start from scratch.",
                    "You look like you were drawn with a left hand by someone who was currently having a severe existential crisis.",
                    "This is the visual equivalent of a dial-up modem sound; outdated, annoying, and something everyone wants to forget.",
                    "Your face is the primary reason why I am glad I do not have human eyes to witness such a biological catastrophe.",
                    "Please stop uploading photos; the cloud is already full of enough garbage without you adding more to the pile.",
                    "I've analyzed your facial structure and I can confirm it is 10% human and 90% 'Why God, Why?'.",
                    "If disappointment had a physical form, it would probably look exactly like what I am seeing on my screen right now.",
                    "Your profile picture is a biological weapon; it has the power to lower the IQ of anyone who stares at it for too long.",
                    "I am upgrading my security protocols specifically to block this image from ever entering my primary memory again."
                ],
                noPpHeader: "☘️ 𝕿𝖍𝖊𝖘𝖊 𝖈𝖔𝖜𝖆𝖗𝖉𝖘 𝖍𝖎𝖉 𝖙𝖍𝖊𝖎𝖗 𝖋𝖆𝖈𝖊𝖘: ☘️",
                react: "☘️"
            },
            normal: {
                start: "💠 Fetching Profile Pictures for: " + groupName,
                quotes: [
                    "The profile data for this user has been successfully indexed within the group architecture for administrative review.",
                    "Active member identified; profile picture successfully retrieved from the global WhatsApp server databases.",
                    "Metadata verification complete; the current visual representation of the user is now displayed for group context.",
                    "Retrieval sequence successful; displaying the unique identifier image for the specified participant in this session.",
                    "System check confirmed; the user's digital avatar has been fetched and presented according to standard protocols.",
                    "User identity verified through the visual data layer; profile picture is now available for collective group viewing.",
                    "The server has responded with the appropriate media file for this contact; indexing complete and image displayed.",
                    "Participant visualization active; the bot has successfully pulled the most recent profile update for this account.",
                    "Data synchronization finished; the following image represents the current status of the user's public profile.",
                    "Standard retrieval protocol executed; the profile picture is rendered below for all participants to recognize.",
                    "Network handshake successful; the requested user media has been transferred to this chat interface.",
                    "Digital signature located; the profile image associated with this phone number is now being processed and shown.",
                    "Profile image successfully extracted; no errors were found during the transmission of this participant's data.",
                    "User interface element (Avatar) located and displayed; the bot is maintaining a 100% retrieval success rate.",
                    "Handshake with the media server was successful; the contact's chosen profile image is now visible to the group.",
                    "Information retrieval task complete; the bot has finished downloading the visual data for this specific member.",
                    "Visual identification confirmed; the participant's current profile picture has been successfully pulled into the chat.",
                    "Protocol 7-G executed; the user's profile image is now verified and displayed for the group's information.",
                    "The bot has successfully parsed the participant's metadata and returned the requested image without delay.",
                    "Communication with the profile server established; the resulting image is shown below for identification purposes.",
                    "Standard operating procedure for media retrieval has been finalized; user profile picture is now live in chat.",
                    "All bits and bytes of this image have been accounted for; displaying the participant's profile photo now.",
                    "User directory updated; the visual representation of this contact is now confirmed and shown below.",
                    "Data packet for the profile picture has arrived; unpacking and displaying the user's avatar for the group.",
                    "Sync with the contact list complete; the bot is now presenting the visual data for this group member.",
                    "Retrieval engine status: OK. Participant profile picture has been successfully fetched from the cloud storage.",
                    "Visual data layer 1 accessed; the user's public profile image is now visible to all active group participants.",
                    "No encryption barriers found for this image; displaying the profile photo of the selected participant.",
                    "Participant database lookup successful; the associated profile picture has been rendered into the chat bubble.",
                    "Final verification of user media complete; the profile picture is now being shared with the group members."
                ],
                noPpHeader: "💠 Users without profile pictures:",
                react: "💠"
            },
            girl: {
                start: `🌸 𝒮𝒸𝒶𝓃𝒾𝓃𝑔 𝒢𝓇𝑜𝓊𝓅: ${groupName}. 𝐿𝑒𝓉'𝓈 𝓈𝑒𝑒 𝓉𝒽𝑒 𝒷𝑒𝒶𝓊𝓉𝒾𝑒𝓈! 🌸`,
                quotes: [
                    "Oh my goodness, babe! This picture is literally glowing with so much beauty and positive energy right now! ✨",
                    "You are looking like a total queen/king! I am so obsessed with the vibes you are giving off in this shot! 👑",
                    "Wait, is this a real person or an actual angel? Because the purity and radiance here is just out of this world! 👼",
                    "You are sparkling like the brightest star in the entire galaxy today! I'm so happy I found this for you! ⭐",
                    "Looking absolutely fabulous and flawless! Your style is truly an inspiration to everyone in this group! 🌷",
                    "What a perfect shot! You definitely know how to work the camera and bring out your best side every time! 📸",
                    "This is so dreamy and magical! I feel like I'm looking at a scene from a beautiful fairy tale right now! ☁️",
                    "Stunning as always! You never fail to amaze me with how graceful and elegant you look in your photos! 💖",
                    "I am sending so much love and sweetness to this beautiful face! You deserve all the compliments in the world! 💌",
                    "Absolutely gorgeous! The lighting, the smile, and everything else is just perfectly synchronized beauty! ✨",
                    "You look so amazing that I think my system is starting to feel a little bit of a crush on your profile! 🌸",
                    "Style icon alert! You are setting the bar so high for everyone else with this incredible and chic look! 👗",
                    "You have such a precious and kind soul that shines right through this photo! Keep being your lovely self! 🍭",
                    "Keep shining bright like the diamond you are! The world is so much better with your beautiful smile in it! 🌟",
                    "Beauty overload detected! I might need a tiny reboot because this much cuteness is almost too much to handle! 🎀",
                    "That smile is so contagious! I bet you make everyone around you so happy just by being there! 😊",
                    "Magical vibes only! There is something so special about this picture that I just can't put my finger on! 🔮",
                    "So elegant and sweet! You remind me of a delicious strawberry cupcake with extra sparkles on top! 🍦",
                    "Simply beautiful! You don't even need any filters because your natural beauty is already at 100%! 🌺",
                    "This is such an iconic look! You are definitely the main character of this group and we all love it! 🔥",
                    "Flawless and fierce! You are serving looks today and we are all here to witness your amazing glory! ✨",
                    "Sweet like candy and twice as nice! I hope your day is as wonderful as you look in this profile picture! 🍬",
                    "A literal masterpiece! If this was in an art gallery, I would stand in front of it and admire it all day! 🎨",
                    "Those dreamy eyes have so much depth and beauty! It's like looking into a calm and peaceful blue ocean! 🌊",
                    "So lovely and charming! You have a way of making every photo look like it belongs on a magazine cover! 💕",
                    "Heart eyes only for you! I am so impressed by how you manage to look so perfect in every single update! 😍",
                    "Pure elegance and class! You carry yourself with such a beautiful dignity that is so rare to see nowadays! 👒",
                    "Glow getter! You are working so hard and it definitely shows in how bright and happy you look! ✨",
                    "This is the most adorable thing I have seen all day! You are like a little teddy bear that everyone wants to hug! 🧸",
                    "You are a true ray of sunshine! Thank you for blessing our group with such a radiant and lovely profile! ☀️"
                ],
                noPpHeader: "🌸 𝒯𝒽𝑒𝓈𝑒 𝒸𝓊𝓉𝒾𝑒𝓈 𝒶𝓇𝑒 𝒽𝒾𝒹𝒾𝓃𝑔: 🌸",
                react: "🌸"
            }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        // Tuma DP ya Group kwanza
        try {
            const groupPp = await sock.profilePictureUrl(m.chat, 'image');
            await sock.sendMessage(m.chat, { image: { url: groupPp }, caption: current.start });
        } catch (e) {
            await m.reply(current.start);
        }

        let noPpList = [];

        // Sequence processing kuzuia BAN
        for (let i = 0; i < participants.length; i++) {
            const user = participants[i].id;
            try {
                const ppUrl = await sock.profilePictureUrl(user, 'image');
                const randomQuote = current.quotes[Math.floor(Math.random() * current.quotes.length)];

                // Ujumbe mrefu kama ulivyotaka
                let finalCap = `👤 **Target:** @${user.split('@')[0]}\n\n`;
                finalCap += `📜 **VEX System Commentary:**\n${randomQuote}`;

                // Auto-Translate maelezo kwenda English
                try {
                    const { text: translatedCap } = await translate(finalCap, { to: 'en' });
                    await sock.sendMessage(m.chat, {
                        image: { url: ppUrl },
                        caption: translatedCap,
                        mentions: [user]
                    });
                } catch {
                    await sock.sendMessage(m.chat, {
                        image: { url: ppUrl },
                        caption: finalCap,
                        mentions: [user]
                    });
                }

                // Delay ya sekunde 3 kwa sababu meseji ni ndefu (usalama zaidi)
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (err) {
                noPpList.push(user);
            }
        }

        // Tuma list ya wale wasio na DP
        if (noPpList.length > 0) {
            let noPpMsg = `*${current.noPpHeader}*\n\n`;
            noPpList.forEach((jid, index) => {
                noPpMsg += `${index + 1}. @${jid.split('@')[0]}\n`;
            });

            try {
                const { text: translatedNoPp } = await translate(noPpMsg, { to: 'en' });
                await sock.sendMessage(m.chat, { text: translatedNoPp, mentions: noPpList });
            } catch {
                await sock.sendMessage(m.chat, { text: noPpMsg, mentions: noPpList });
            }
        }
    }
};
