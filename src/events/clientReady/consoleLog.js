const { ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'quotes.json');

module.exports = (client) => {
    console.log(`${client.user.tag} is online`);

    const data = fs.readFileSync(filePath, 'utf8');
    const quotesArray = JSON.parse(data);
    const count = quotesArray.length;

    client.user.setActivity({
        name: `已收錄 ${count} 篇複製文`,
        type: ActivityType.Playing
    });
};