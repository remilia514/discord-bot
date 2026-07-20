const { testServer } = require('../../../config.json');
const arecommandsDifferent = require('../../utils/areCommandsDifferent');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client) => {
    try {
        const localCommands = getLocalCommands();
        const applicationCommands = getApplicationCommands(client, testServer);

        for (const localCommand of localCommands) {
            const { name, description, options } = localCommand;

            const existingCommand = await applicationCommands?.cache?.find(
                (cmd) => cmd.name === name
            );

            if (existingCommand) {
                if (localCommand.deleted) {
                    await existingCommand.delete(existingCommand.id);
                    continue;
                }
                
                if (arecommandsDifferent(existingCommand, localCommand)) {
                    await existingCommand.edit(existingCommand.id, {
                        description,
                        options
                    });

                    console.log(`Edited command: ${name}`);
                }
            } else {
                if (localCommand.deleted) {
                    console.log(`Command ${name} is marked as deleted, skipping registration.`);
                    continue;
                }

                await client.application.commands.create({
                    name,
                    description,
                    options,
                });

                console.log(`Registered command: ${name}`);
            }
        }
    } catch (error) {
        console.error(error);
    }
};