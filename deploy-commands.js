const { REST, Routes } = require("discord.js");
require("dotenv").config();

const commands = require("./commands");

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log("Started deploying application (/) commands.");

        // Deploy new commands
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log(`Successfully deployed ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();


//
// const { REST, Routes } = require('discord.js');
// require('dotenv').config();
//
// const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
//
// // for guild-based commands
// rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID))
//     .then(commands => {
//         for (const command of commands) {
//             const deleteUrl = `${Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)}/${command.id}`;
//             rest.delete(deleteUrl)
//                 .then(() => console.log(`Successfully deleted command ${command.name}`))
//                 .catch(console.error);
//         }
//     })
//     .catch(console.error);
//
// // for global commands
// rest.get(Routes.applicationCommands(process.env.CLIENT_ID))
//     .then(commands => {
//         for (const command of commands) {
//             const deleteUrl = `${Routes.applicationCommands(process.env.CLIENT_ID)}/${command.id}`;
//             rest.delete(deleteUrl)
//                 .then(() => console.log(`Successfully deleted global command ${command.name}`))
//                 .catch(console.error);
//         }
//     })
//     .catch(console.error);