module.exports = async (client, guildID) => {
    let applicationCommands;

    if (guildID) {
        const guild = await client.guilds.fetch(guildID);
        applicationCommands = guild.commands;
    } else {
        applicationCommands = await client.application?.commands;
    }

    if (!applicationCommands) {
        return { cache: new Map() }; 
    }

    await applicationCommands.fetch();
    return applicationCommands;
}