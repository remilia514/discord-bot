const { MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'quotes.json');

function splitTextSmartly(text, maxLength = 2000) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        let chunk = remaining.slice(0, maxLength);
        const splitIndex = Math.max(
            chunk.lastIndexOf('，'), chunk.lastIndexOf(','),
            chunk.lastIndexOf('。'), chunk.lastIndexOf('.'),
            chunk.lastIndexOf('！'), chunk.lastIndexOf('!'),
            chunk.lastIndexOf('？'), chunk.lastIndexOf('?'),
            chunk.lastIndexOf('\n')
        );

        if (splitIndex > maxLength / 2) {
            chunks.push(remaining.slice(0, splitIndex + 1));
            remaining = remaining.slice(splitIndex + 1);
        } else {
            chunks.push(chunk);
            remaining = remaining.slice(maxLength);
        }
    }
    return chunks;
}

module.exports = {
    name: 'randomcopypasta',
    description: '隨機選擇複製文',

    callback: async (client, interaction) => {
        try {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const data = await fs.readFile(filePath, 'utf8');
                    const quotesArray = JSON.parse(data);
                    const randomIndex = Math.floor(Math.random() * quotesArray.length);
                    const quote = quotesArray[randomIndex];
                    const chunks = splitTextSmartly(quote, 2000);

                    for (const chunk of chunks) {
                        await interaction.channel.send({ content: chunk });
                    }
                    await interaction.deleteReply();
                    return;
        } catch (error) {
            console.error(error);
        }
    },
};