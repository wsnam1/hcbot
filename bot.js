const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
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



async function createPoll(interaction, person, isWoosungHosting = false, customData = null) {
    let location, details, title;

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

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`Location: [${location}](${mapUrl})\nDetails: ${details}`)
        .setColor('#0099ff')
        .addFields(
            { name: 'Yes', value: '0', inline: true },
            { name: 'No', value: '0', inline: true }
        )


    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('no')
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
        );

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const votes = { yes: new Set(), no: new Set() };
    const pollDuration = 3 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
    const endTime = Date.now() + pollDuration;

    const collector = message.createMessageComponentCollector({ time: pollDuration });

    const updateInterval = setInterval(() => {
        if (Date.now() < endTime) {
            updateEmbed();
        } else {
            clearInterval(updateInterval);
            collector.stop();
        }
    }, 1000); // Update every second

    collector.on('collect', async i => {
        const vote = i.customId;
        const otherVote = vote === 'yes' ? 'no' : 'yes';

        if (votes.yes.has(i.user.id) || votes.no.has(i.user.id)) {
            await i.reply({ content: 'You have already voted!', ephemeral: true });
            return;
        }

        votes[vote].add(i.user.id);
        votes[otherVote].delete(i.user.id);

        await i.reply({ content: `You voted ${vote}!`, ephemeral: true });

        updateEmbed();
    });

    collector.on('end', () => {
        clearInterval(updateInterval);
        updateEmbed(true);
    });

    function updateEmbed(ended = false) {
        const yesVoters = Array.from(votes.yes).map(id => `<@${id}>`).join(', ') || 'None';
        const noVoters = Array.from(votes.no).map(id => `<@${id}>`).join(', ') || 'None';

        embed.spliceFields(0, 2,
            { name: `Yes (${votes.yes.size})`, value: yesVoters, inline: false },
            { name: `No (${votes.no.size})`, value: noVoters, inline: false }
        );

        if (ended) {
            embed.setFooter({ text: 'Poll closed' });
            row.components.forEach(button => button.setDisabled(true));
        } else {
            const remainingTime = Math.max(0, endTime - Date.now());
            const days = Math.floor(remainingTime / (24 * 60 * 60 * 1000));
            const hours = Math.floor((remainingTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
            embed.setFooter({ text: `Poll closes in ${days}d ${hours}h ${minutes}m ${seconds}s` });
        }

        interaction.editReply({ embeds: [embed], components: [row] });
    }
}

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === "karis" || commandName === "jae") {
            await createPoll(interaction, commandName);
        } else if (commandName === "custompoll") {
            const name = interaction.options.getString('name');
            const location = interaction.options.getString('location');
            const details = interaction.options.getString('details');

            await createPoll(interaction, null, false, { name, location, details });
        } else if (commandName === "woosung") {
            const host = interaction.options.getString('host');
            await createPoll(interaction, host, true);
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
