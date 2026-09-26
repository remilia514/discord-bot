const { Client, GatewayIntentBits } = require("discord.js");
require('dotenv').config();

const { testServer } = require("../config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
]});

client.once('ready', async () => {
    try{
        if (testServer) {
            const guild = await client.guilds.fetch(testServer);
            await guild.commands.set([]);
            console.log(`commands cleared`)
    }

    await client.application.commands.set([]);
    } catch (error) {
        console.error(error);
    }
});

client.login(process.env.TOKEN);