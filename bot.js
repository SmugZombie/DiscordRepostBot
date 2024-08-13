const { Client, GatewayIntentBits } = require('discord.js');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

let DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const hashStorePath = path.join(__dirname, 'data', 'image-hashes.json');

let imageHashes = {};

// Load existing hashes from file
if (fs.existsSync(hashStorePath)) {
    imageHashes = fs.readJsonSync(hashStorePath);
}

// Function to create a hash of the image
function hashImage(imageBuffer) {
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

// Function to check if the image hash exists
function isRepost(hash) {
    return hash in imageHashes;
}

// Function to store the hash with message info
function storeHash(hash, message) {
    imageHashes[hash] = {
        url: message.url,
        author: message.author.tag,
        channel: message.channel.name,
        date: new Date().toISOString()
    };
    fs.writeJsonSync(hashStorePath, imageHashes);
}

client.on('messageCreate', async (message) => {
    if (message.attachments.size > 0) {
        const fetch = (await import('node-fetch')).default;  // Dynamic import

        message.attachments.forEach(async (attachment) => {
            const response = await fetch(attachment.url);
            const imageBuffer = await response.buffer();

            const imageHash = hashImage(imageBuffer);

            if (isRepost(imageHash)) {
                const original = imageHashes[imageHash];
                message.reply(`Repost detected! Originally posted by ${original.author} in #${original.channel} on ${new Date(original.date).toLocaleString()}.\nLink: ${original.url}`);
            } else {
                storeHash(imageHash, message);
            }
        });
    }
});

client.login(DISCORD_TOKEN);
