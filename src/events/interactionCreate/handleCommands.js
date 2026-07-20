const getLocalCommands = require("../../utils/getLocalCommands");

module.exports = async (client, interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

    const localCommands = getLocalCommands();

    try {
        const commandObject = localCommands.find(
            (cmd) => cmd.name === interaction.commandName
        );

        if (!commandObject) return;

        if (interaction.isAutocomplete()) {
            if (commandObject.autocomplete) {
                await commandObject.autocomplete(client, interaction);
            }
            return;
        }

        if (interaction.isChatInputCommand()) {
            await commandObject.callback(client, interaction);
        }

    } catch (error) {
        console.error(error);
    }
};