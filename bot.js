const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
});

const axios = require('axios');

async function createPoll(channelId, question, answers, duration = 24) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

    const headers = {
        'Authorization': `Bot ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json',
    };

    const pollData = {
        question: { text: question },
        answers: answers.map(answer => ({ poll_media: { text: answer } })),
        duration: duration,
        allow_multiselect: false,
        layout_type: 1
    };

    const payload = {
        content: "Here's a new poll!",
        poll: pollData
    };

    try {
        const response = await axios.post(url, payload, { headers });
        return response.data;
    } catch (error) {
        console.error('Error creating poll:', error.response?.data || error.message);
        throw error;
    }
}

// Example usage in your existing bot code
client.on("messageCreate", async (message) => {
    if (message.content.startsWith("!poll")) {
        const args = message.content.slice(5).trim().split('|');
        if (args.length < 3) {
            message.reply("Usage: !poll Question | Option 1 | Option 2 | ...");
            return;
        }

        const question = args[0].trim();
        const answers = args.slice(1).map(a => a.trim());

        if (answers.length > 10) {
            message.reply("You can only have up to 10 options in a poll.");
            return;
        }

        try {
            await createPoll(message.channel.id, question, answers);
            message.reply("Poll created successfully!");
        } catch (error) {
            message.reply("Failed to create the poll. Please try again later.");
        }
    }

    // ... rest of your message handling code
});


client.once("ready", () => {
    console.log("Bot is ready!");
});

client.login(process.env.BOT_TOKEN);
