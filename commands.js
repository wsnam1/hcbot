const { SlashCommandBuilder } = require("discord.js");

const karisCommand = new SlashCommandBuilder()
    .setName("karis")
    .setDescription("Create a poll for Karis's housing");

const jaeCommand = new SlashCommandBuilder()
    .setName("jae")
    .setDescription("Create a poll for Jae's housing");

const woosungCommand = new SlashCommandBuilder()
    .setName('woosung')
    .setDescription('Create a poll for Woosung hosting')
    .addStringOption(option =>
        option.setName('host')
            .setDescription('Select the host')
            .setRequired(true)
            .addChoices(
                { name: 'Karis', value: 'karis' },
                { name: 'Jae', value: 'jae' }
            ));

const customPollCommand = new SlashCommandBuilder()
    .setName("custompoll")
    .setDescription("Create a custom poll")
    .addStringOption((option) =>
        option
            .setName("name")
            .setDescription("The name of the poll")
            .setRequired(true),
    )
    .addStringOption((option) =>
        option
            .setName("location")
            .setDescription("The location for the poll")
            .setRequired(true),
    )
    .addStringOption((option) =>
        option
            .setName("details")
            .setDescription("Additional details for the poll")
            .setRequired(false),
    );

module.exports = [karisCommand, jaeCommand, woosungCommand, customPollCommand];

