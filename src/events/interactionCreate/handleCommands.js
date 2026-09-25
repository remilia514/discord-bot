const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client, interaction) => {
    const isCommand =
        interaction.isChatInputCommand() ||
        interaction.isAutocomplete();

    const isComponent =
        interaction.isStringSelectMenu() ||
        interaction.isButton();

    if (!isCommand && !isComponent) return;

    try {
        const localCommands = getLocalCommands();

        if (isComponent) {
            const commandObject = localCommands.find(command =>
                interaction.customId.startsWith(`${command.name}:`)
            );

            if (commandObject?.component) {
                await commandObject.component(client, interaction);
            }
            return;
        }

        const commandObject = localCommands.find(
            command => command.name === interaction.commandName
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

        if (interaction.isAutocomplete() && !interaction.responded) {
            await interaction.respond([]).catch(() => {});
        } else if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {
            await interaction.reply({
                content: '處理互動時發生錯誤。',
                ephemeral: true,
            }).catch(() => {});
        }
    }
};