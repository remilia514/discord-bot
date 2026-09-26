const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'quotes.json');

module.exports = {
    name: 'addcopypasta',
    description: '新增複製文',
    options: [
        {
            name: 'content',
            description: '內容',
            type: 3,
            required: true,
        }
    ],

    callback: async (client, interaction) => {
        let content = interaction.options.getString('content');
        let quotesArray = [];

        if (content.length > 2000) {
            content = content.slice(0, 1990) + '...';
        }

        try {
            if (fs.existsSync(filePath)) {
                const fileData = fs.readFileSync(filePath, 'utf8');
                quotesArray = JSON.parse(fileData); 
            }

            if (quotesArray.includes(content.trim())) {
                return await interaction.reply({ 
                    content: `重複登記了，有點創意好嗎==`, 
                    ephemeral: true
                });
            }

            quotesArray.push(content);
            fs.writeFileSync(filePath, JSON.stringify(quotesArray, null, 2), 'utf8');

            let replyText = `已新增 **${content}**`;
            if (replyText.length > 2000) {
                replyText = replyText.slice(0, 1990) + '...';
            }

            await interaction.reply(replyText);

        } catch (error) {
            console.error(error);
        }
    },
};