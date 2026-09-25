const fs = require('fs');
const path = require('path');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

const filePath = path.join(__dirname, '..', '..', 'quotes.json');

let cachedQuotes = [];
let cachedMtimeMs = -1;

function getQuotes() {
    try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs !== cachedMtimeMs) {
            const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            cachedQuotes = Array.isArray(parsed)
                ? parsed.filter(quote => typeof quote === 'string')
                : [];
            cachedMtimeMs = stat.mtimeMs;
        }
        return cachedQuotes;
    } catch (error) {
        console.error(error);
        return [];
    }
}

function filterQuotes(keyword) {
    const allQuotes = getQuotes();
    if (!keyword) return [];
    
    const lowerKw = keyword.toLowerCase();
    const matches = [];

    for (let i = 0; i < allQuotes.length; i++) {
        if (allQuotes[i].toLowerCase().includes(lowerKw)) {
            matches.push({ originalIndex: i, text: allQuotes[i] });
        }
    }
    return matches;
}

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

async function sendQuote(interaction, quote) {
    const chunks = splitTextSmartly(quote, 2000);
    for (const chunk of chunks) {
        await interaction.channel.send({ content: chunk });
    }
}

module.exports = {
    name: 'searchcopypasta',
    description: '透過關鍵字搜尋複製文',
    options: [
        {
            name: 'keyword',
            description: '輸入關鍵字',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
    ],

    autocomplete: async (client, interaction) => {
        const focusedValue = interaction.options.getFocused().trim();
        const allQuotes = getQuotes();

        if (!focusedValue) {
            const choices = allQuotes.slice(0, 25).map((q, index) => ({
                name: `#${index + 1}. ${q}`.slice(0, 100),
                value: String(index),
            }));
            return interaction.respond(choices);
        }

        const matches = filterQuotes(focusedValue);
        const choices = matches.slice(0, 25).map(m => ({
            name: `#${m.originalIndex + 1}. ${m.text}`.slice(0, 100),
            value: String(m.originalIndex),
        }));

        await interaction.respond(choices);
    },

    callback: async (client, interaction) => {
        const inputValue = interaction.options.getString('keyword').trim();
        const allQuotes = getQuotes();
        let selectedIndex = Number(inputValue);

        if (!Number.isInteger(selectedIndex) || allQuotes[selectedIndex] === undefined) {
            const matches = filterQuotes(inputValue);
            if (matches.length > 0) {
                selectedIndex = matches[0].originalIndex;
            }
        }

        try {
            await sendQuote(interaction, allQuotes[selectedIndex]);
        } catch (error) {
            console.error(error);
        }
    },
};