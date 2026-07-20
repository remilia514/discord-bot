const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', '..', 'quotes.json');

module.exports = {
    name: 'randomcopypasta',
    description: '隨機選擇複製文',

    callback: async (client, interaction) => {
        try {
            const quotesArray = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const randomIndex = Math.floor(Math.random() * quotesArray.length);
            const Quote = quotesArray[randomIndex];

            if (Quote.length > 2000) {
                Quote = Quote.substring(0, 1995) + '...';
            }
            
            await interaction.reply(`${Quote}`);

        } catch (error) {
            console.error(error);
        }
    },
};