const { ActivityType } = require('discord.js');

module.exports = (client) => {
    console.log(`${client.user.tag} is online`);

        client.user.setActivity({
        name: '男娘淫夢共和國',
        type: ActivityType.Playing
    });
}