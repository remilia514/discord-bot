const path = require('path');
const getallFiles = require('./getAllFiles');

module.exports = ( exceptions = []) => {
    let localCommands = [];

    const commandsCategories = getallFiles(
        path.join(__dirname, '..', 'commands'), 
        true
    );

    for (const commandCategory of commandsCategories) {
        const commandFiles = getallFiles(commandCategory);

        for (const commandFile of commandFiles) {
            const commandObject = require(commandFile);

            if (exceptions.includes(commandObject.name)) {
                continue;
            }
        
            localCommands.push(commandObject);
        }
    }
    return localCommands;
}