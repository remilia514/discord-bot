const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'quotes.json');
const GROUP_SIZE = 25;

let cachedQuotes = [];
let cachedMtimeMs = -1;

function getQuotes() {
    try {
        const stat = fs.statSync(filePath);

        if (stat.mtimeMs !== cachedMtimeMs) {
            const data = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);

            cachedQuotes = Array.isArray(parsed)
                ? parsed.filter(quote => typeof quote === 'string')
                : [];

            cachedMtimeMs = stat.mtimeMs;
        }

        return cachedQuotes;
    } catch (error) {
        console.error('讀取 quotes.json 失敗：', error);
        return [];
    }
}

module.exports = {
    name: 'viewcopypasta',
    description: '查詢特定複製文',
    options: [
        {
            name: 'group',
            description: '選擇範圍',
            type: 3,
            required: true,
            autocomplete: true,
        },
        {
            name: 'content',
            description: '選擇內容',
            type: 3,
            required: true,
            autocomplete: true,
        },
    ],

    autocomplete: async (client, interaction) => {
        try {
            const focused = interaction.options.getFocused(true);
            const input = String(focused.value ?? '').trim().toLowerCase();
            const quotes = getQuotes();

            if (focused.name === 'group') {
                const groups = [];

                for (let start = 0; start < quotes.length; start += GROUP_SIZE) {
                    const end = Math.min(start + GROUP_SIZE, quotes.length);

                    groups.push({
                        name: `${start + 1} ~ ${end}`,
                        value: `${start}:${end}`,
                    });
                }

                const choices = groups
                    .filter(group =>
                        !input ||
                        group.name.toLowerCase().includes(input) ||
                        group.value.includes(input)
                    )
                    .slice(0, 25);

                return await interaction.respond(choices);
            }

            if (focused.name === 'content') {
                const groupValue = interaction.options.getString('group') ?? '';
                const match = /^(\d+):(\d+)$/.exec(groupValue);

                if (!match) {
                    return await interaction.respond([]);
                }

                const start = Number(match[1]);
                const end = Number(match[2]);

                const choices = [];

                for (let index = start; index < Math.min(end, quotes.length); index++) {
                    const quote = quotes[index];
                    const number = index + 1;

                    if (
                        input &&
                        !quote.toLowerCase().includes(input) &&
                        !String(number).includes(input)
                    ) {
                        continue;
                    }

                    choices.push({
                        name: `${number}. ${quote}`.slice(0, 100),
                        value: String(index),
                    });

                    if (choices.length === 25) break;
                }

                return await interaction.respond(choices);
            }

            return await interaction.respond([]);
        } catch (error) {
            console.error('處理 autocomplete 失敗：', error);

            if (!interaction.responded) {
                await interaction.respond([]).catch(() => {});
            }
        }
    },

    callback: async (client, interaction) => {
        const quotes = getQuotes();
        const index = Number(interaction.options.getString('content'));

        if (!Number.isInteger(index) || index < 0 || index >= quotes.length) {
            return interaction.reply({
                content: '找不到這篇複製文，請重新選擇分類和內容。',
                ephemeral: true,
            });
        }

        const quote = quotes[index];

        const replyContent =
            quote.length > 2000
                ? `${quote.slice(0, 1997)}...`
                : quote;

        return interaction.reply({ content: replyContent });
    },
};