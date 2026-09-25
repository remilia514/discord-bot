const fs = require('fs');
const path = require('path');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
} = require('discord.js');

const filePath = path.join(__dirname, '..', '..', 'quotes.json');
const ITEMS_PER_GROUP = 25;
const GROUPS_PER_PAGE = 25;
const ITEMS_PER_PAGE = ITEMS_PER_GROUP * GROUPS_PER_PAGE;
const PAGES_PER_WINDOW = 25;

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
        console.error('讀取失敗：', error);
        return [];
    }
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

function makePageMenu(quotes, page, windowIndex, ownerId) {
    const totalPages = Math.max(1, Math.ceil(quotes.length / ITEMS_PER_PAGE));
    const firstPage = windowIndex * PAGES_PER_WINDOW;
    const options = [];

    for (let p = firstPage; p < Math.min(firstPage + PAGES_PER_WINDOW, totalPages); p++) {
        const first = p * ITEMS_PER_PAGE + 1;
        const last = Math.min((p + 1) * ITEMS_PER_PAGE, quotes.length);
        options.push({
            label: `${first}–${last}`,
            value: String(p),
            default: p === page,
        });
    }

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`viewcopypasta:page:${windowIndex}:${ownerId}`)
            .setPlaceholder('選擇頁數')
            .setDisabled(options.length === 0)
            .addOptions(options.length ? options : [{ label: '無可用內容', value: '0' }])
    );
}

function makeGroupMenu(quotes, page, group, ownerId) {
    const pageStart = page * ITEMS_PER_PAGE;
    const pageEnd = Math.min(pageStart + ITEMS_PER_PAGE, quotes.length);
    const options = [];

    for (let start = pageStart; start < pageEnd; start += ITEMS_PER_GROUP) {
        const end = Math.min(start + ITEMS_PER_GROUP, pageEnd);
        const groupIndex = Math.floor((start - pageStart) / ITEMS_PER_GROUP);
        options.push({
            label: `${start + 1}–${end}`,
            value: String(groupIndex),
            default: groupIndex === group,
        });
    }

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`viewcopypasta:group:${page}:${ownerId}`)
            .setPlaceholder('選擇分組')
            .setDisabled(quotes.length === 0)
            .addOptions(options.length ? options : [{ label: '無可用內容', value: '0' }])
    );
}

function makeContentMenu(quotes, page, group, selectedQuote, ownerId) {
    const options = [];
    if (group !== null) {
        const start = page * ITEMS_PER_PAGE + group * ITEMS_PER_GROUP;
        const end = Math.min(start + ITEMS_PER_GROUP, quotes.length);
        for (let index = start; index < end; index++) {
            options.push({
                label: `${index + 1}. ${quotes[index]}`.slice(0, 100),
                value: String(index),
                default: selectedQuote === index,
            });
        }
    }

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`viewcopypasta:content:${page}:${group ?? -1}:${ownerId}`)
            .setPlaceholder('選擇複製文內容')
            .setDisabled(options.length === 0)
            .addOptions(options.length ? options : [{ label: '請先選擇分組', value: '0' }])
    );
}

function makeSendRow(page, group, selectedQuote, ownerId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`viewcopypasta:send:${page}:${group ?? -1}:${selectedQuote ?? -1}:${ownerId}`)
            .setLabel('發送複製文')
            .setStyle(ButtonStyle.Success)
            .setDisabled(selectedQuote === null)
    );
}

function makeEmbed(quotes, selectedQuote, notice = '') {
    const embed = new EmbedBuilder()
        .setColor(0x9b2335)
        .setTitle('複製文選單');

    if (selectedQuote !== null && quotes[selectedQuote] !== undefined) {
        const quote = quotes[selectedQuote];
        let previewText = quote;
        if (quote.length > 400) {
            const shortChunk = quote.slice(0, 400);
            const splitIndex = Math.max(
                shortChunk.lastIndexOf('，'), shortChunk.lastIndexOf(','),
                shortChunk.lastIndexOf('。'), shortChunk.lastIndexOf('.'),
                shortChunk.lastIndexOf('\n')
            );
            previewText = (splitIndex > 300 ? shortChunk.slice(0, splitIndex + 1) : shortChunk) + '...';
        }

        embed.addFields({
            name: '當前預覽',
            value: previewText,
            inline: false,
        });
    }

    if (notice) embed.setFooter({ text: notice });
    return embed;
}

function makeComponents(quotes, page, group, selectedQuote, windowIndex, ownerId) {
    return [
        makePageMenu(quotes, page, windowIndex, ownerId),
        makeGroupMenu(quotes, page, group, ownerId),
        makeContentMenu(quotes, page, group, selectedQuote, ownerId),
        makeSendRow(page, group, selectedQuote, ownerId),
    ];
}

function render(interaction, quotes, page, group, selectedQuote, ownerId, notice = '') {
    const windowIndex = Math.floor(page / PAGES_PER_WINDOW);
    return interaction.update({
        embeds: [makeEmbed(quotes, selectedQuote, notice)],
        components: makeComponents(quotes, page, group, selectedQuote, windowIndex, ownerId),
    });
}

module.exports = {
    name: 'viewcopypasta',
    description: '選擇特定複製文',
    options: [],

    callback: async (client, interaction) => {
        const quotes = getQuotes();
        const ownerId = interaction.user.id;

        await interaction.reply({
            embeds: [makeEmbed(quotes, null)],
            components: makeComponents(quotes, 0, null, null, 0, ownerId),
            flags: [MessageFlags.Ephemeral],
        });
    },

    component: async (client, interaction) => {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const ownerId = parts[parts.length - 1];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '此選單不屬於你',
                flags: [MessageFlags.Ephemeral],
            });
        }

        const quotes = getQuotes();
        const totalPages = Math.max(1, Math.ceil(quotes.length / ITEMS_PER_PAGE));
        let page = 0;
        let group = null;
        let selectedQuote = null;
        let notice = '';

        if (action === 'page') {
            page = Number(interaction.values[0]);
        } else if (action === 'group') {
            page = Number(parts[2]);
            group = Number(interaction.values[0]);
        } else if (action === 'content') {
            page = Number(parts[2]);
            group = Number(parts[3]);
            selectedQuote = Number(interaction.values[0]);
        } else if (action === 'send') {
            page = Number(parts[2]);
            group = Number(parts[3]);
            selectedQuote = Number(parts[4]);

            const quote = quotes[selectedQuote];
            if (!Number.isInteger(selectedQuote) || typeof quote !== 'string') {
                return render(interaction, quotes, 0, null, null, ownerId, '複製文不存在');
            }

            try {
                await interaction.deferUpdate();

                const chunks = splitTextSmartly(quote, 2000);
                    for (const chunk of chunks) {
                        await interaction.channel.send({ content: chunk });
                    }
                    await interaction.deleteReply();
                    return;
                    
            } catch (error) {
                console.error('傳送失敗：', error);
                const reason = error.message ? error.message : '未知錯誤';
                notice = `發送失敗：${reason}`;
            }

            return render(interaction, quotes, page, group, selectedQuote, ownerId, notice);
        } else {
            return;
        }

        page = Math.max(0, Math.min(page, totalPages - 1));

        if (group !== null && (!Number.isInteger(group) || group < 0 || group >= GROUPS_PER_PAGE)) {
            group = null;
        }

        if (
            selectedQuote !== null &&
            (!Number.isInteger(selectedQuote) ||
                selectedQuote < page * ITEMS_PER_PAGE ||
                selectedQuote >= Math.min((page + 1) * ITEMS_PER_PAGE, quotes.length) ||
                (group !== null && Math.floor((selectedQuote % ITEMS_PER_PAGE) / ITEMS_PER_GROUP) !== group))
        ) {
            selectedQuote = null;
        }

        await render(interaction, quotes, page, group, selectedQuote, ownerId, notice);
    },
};