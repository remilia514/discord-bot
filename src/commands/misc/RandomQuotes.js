const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'randomquote',
    description: '隨機選擇成員語錄',

    callback: async (client, interaction) => {
        try {
            const dir = path.join(__dirname, '..', '..', 'quoteImages')
            const files = fs.readdirSync(dir)
            const random = files[Math.floor(Math.random() * files.length)];
            const image = path.join(dir, random)

            await interaction.reply({files: [new AttachmentBuilder(image)]});

        } catch (error) {
            console.error(error);
        }
    },
};