const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Discord bot is running!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});


const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
require("dotenv").config();
const keep_alive = require('./keep_alive.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers],
});

const housingDetails = {
    karis: {
        location: "2943 Laurel Mill Way, Houston, TX 77080",
        details: "Gate Code: 8569",
    },
    jae: {
        location: "22607 Powell House Ln, Katy, TX",
        details: "",
    },
};

function getGoogleMapsUrl(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

async function createPoll(interaction, person, isWoosungHosting = false, customData = null, duration = 72) {
    let location, details, title;
    const pollDuration = duration * 60 * 60 * 1000; // Convert hours to milliseconds

    if (customData) {
        location = customData.location;
        details = customData.details || 'No additional details provided';
        title = `Custom Poll: ${customData.name}`;
    } else if (isWoosungHosting && person) {
        location = housingDetails[person].location;
        details = housingDetails[person].details;
        title = `Hosted by Woosung at ${person.charAt(0).toUpperCase() + person.slice(1)}'s`;
    } else if (person) {
        location = housingDetails[person].location;
        details = housingDetails[person].details;
        title = `HC Poll for ${person.charAt(0).toUpperCase() + person.slice(1)}`;
    } else {
        throw new Error('Invalid poll parameters');
    }

    const mapUrl = getGoogleMapsUrl(location);
    const endTime = Date.now() + pollDuration;
    const endDate = new Date(endTime).toLocaleString();

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`Location: [${location}](${mapUrl})\nDetails: ${details}`)
        .setColor('#0099ff')
        .addFields(
            { name: 'Yes', value: '0', inline: true },
            { name: 'No', value: '0', inline: true },
            { name: 'Total Attendees', value: '0', inline: false }
        )
        .setFooter({ text: `Poll closes on ${endDate}` });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('no')
                .setLabel('No')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('vip')
                .setLabel('VIP')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('close')
                .setLabel('Close Poll')
                .setStyle(ButtonStyle.Secondary)
        );

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const votes = { yes: new Set(), no: new Set() };
    const vipCounts = new Map();

    const collector = message.createMessageComponentCollector({ time: pollDuration });
    const reminderTimes = [0.75, 0.5, 0.25];
    reminderTimes.forEach(percentage => {
        setTimeout(() => sendReminder(interaction, votes, percentage), pollDuration * percentage);
    });
    collector.on('collect', async i => {
        if (i.customId === 'close') {
            if (i.user.id === interaction.user.id || i.member.permissions.has('ADMINISTRATOR')) {
                await i.reply({ content: 'Poll closed by admin.', ephemeral: true });
                collector.stop('closed');
            } else {
                await i.reply({ content: 'You do not have permission to close this poll.', ephemeral: true });
            }
        } else if (i.customId === 'vip') {
            const currentVips = vipCounts.get(i.user.id) || 0;
            const newVipCount = currentVips + 1;
            vipCounts.set(i.user.id, newVipCount);
            votes.yes.add(i.user.id);
            votes.no.delete(i.user.id);
            await i.reply({ content: `You're now bringing ${newVipCount} VIP(s)!`, ephemeral: true });
        } else {
            const vote = i.customId;
            const otherVote = vote === 'yes' ? 'no' : 'yes';
            votes[vote].add(i.user.id);
            votes[otherVote].delete(i.user.id);
            if (vote === 'no') vipCounts.delete(i.user.id);
            await i.reply({ content: `You voted ${vote}!`, ephemeral: true });
        }
        updateEmbed();
    });

    collector.on('end', async (collected, reason) => {
        updateEmbed(true, reason);

        const results = collect_poll_results(votes, vipCounts);

        const summaryEmbed = new EmbedBuilder()
            .setTitle(`Poll Results: ${title}`)
            .setColor('#0099ff')
            .addFields(
                { name: 'Location', value: `[${location}](${mapUrl})` || '\u200b', inline: false },
                { name: 'Details', value: details || '\u200b', inline: false },
                { name: `Yes (${results.total_yes}) | VIPs (${results.total_vips})`, value: results.yes_details || '\u200b', inline: false },
                { name: `No (${results.total_no})`, value: results.no_details || '\u200b', inline: false },
                { name: 'Total Attendees', value: `${results.total_attendees}` || '\u200b', inline: false }
            )
            .setFooter({ text: 'Drive safe guys' });

        await interaction.channel.send({ embeds: [summaryEmbed] });
    });

    function updateEmbed(ended = false, reason = '') {
        const yesVoters = Array.from(votes.yes).map(id => {
            const vipCount = vipCounts.get(id) || 0;
            return `<@${id}>${vipCount > 0 ? ` (+${vipCount} VIP)` : ''}`;
        }).join(', ') || 'None';
        const noVoters = Array.from(votes.no).map(id => `<@${id}>`).join(', ') || 'None';

        const totalVips = Array.from(vipCounts.values()).reduce((sum, count) => sum + count, 0);
        const totalYes = votes.yes.size;
        const totalAttendees = totalYes + totalVips;

        embed.setFields(
            { name: `Yes (${totalYes}) | VIPs (${totalVips})`, value: yesVoters, inline: false },
            { name: `No (${votes.no.size})`, value: noVoters, inline: false },
            { name: `Total Attendees`, value: `${totalAttendees}`, inline: false }
        );

        if (ended) {
            embed.setFooter({ text: reason === 'closed' ? 'Poll closed by admin' : 'Poll closed' });
            row.components.forEach(button => button.setDisabled(true));
        }

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}

async function sendReminder(interaction, votes, percentage) {
    const guild = interaction.guild;
    const members = await guild.members.fetch();

    const votedMembers = new Set([...votes.yes, ...votes.no]);
    const nonVotedMembers = members.filter(member => !member.user.bot && !votedMembers.has(member.id));

    if (nonVotedMembers.size > 0) {
        const reminderMessage = `Reminder: ${Math.round(percentage * 100)}% of the poll duration has passed. Please vote if you haven't already!\n${nonVotedMembers.map(member => `<@${member.id}>`).join(', ')}`;
        await interaction.channel.send(reminderMessage);
    }
}

function collect_poll_results(votes, vipCounts) {
    const yes_voters = Array.from(votes.yes).map(id => `<@${id}>`);
    const no_voters = Array.from(votes.no).map(id => `<@${id}>`);

    const yes_details = yes_voters.join(', ') || 'None';
    const no_details = no_voters.join(', ') || 'None';

    const total_vips = Array.from(vipCounts.values()).reduce((sum, count) => sum + count, 0);
    const total_yes = votes.yes.size;
    const total_no = votes.no.size;
    const total_attendees = total_yes + total_vips;

    return {
        yes_details,
        no_details,
        total_yes,
        total_no,
        total_vips,
        total_attendees
    };
}

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === "karis" || commandName === "jae") {
            const duration = interaction.options.getInteger('duration') || 72; // Default to 72 hours if not specified
            await createPoll(interaction, commandName, false, null, duration);
        } else if (commandName === "custompoll") {
            const name = interaction.options.getString('name');
            const location = interaction.options.getString('location');
            const details = interaction.options.getString('details');
            const duration = interaction.options.getInteger('duration') || 72; // Default to 72 hours if not specified
            await createPoll(interaction, null, false, { name, location, details }, duration);
        } else if (commandName === "woosung") {
            const host = interaction.options.getString('host');
            const duration = interaction.options.getInteger('duration') || 72; // Default to 72 hours if not specified
            await createPoll(interaction, host, true, null, duration);
        }
    } catch (error) {
        console.error('Error creating poll:', error);
        await interaction.reply({ content: 'An error occurred while creating the poll.', ephemeral: true });
    }
});

client.once("ready", () => {
    console.log("Bot is ready!");
});

client.login(process.env.BOT_TOKEN);