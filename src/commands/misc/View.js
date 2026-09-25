const fs = require('fs');
const path = require('path');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
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
            .setPlaceholder('預覽')
            .setDisabled(options.length === 0)
            .addOptions(options.length ? options : [{ label: 'no content available', value: '0' }])
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
            .setPlaceholder('預覽')
            .setDisabled(quotes.length === 0)
            .addOptions(options.length ? options : [{ label: 'no content available', value: '0' }])
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
            .setPlaceholder('預覽')
            .setDisabled(options.length === 0)
            .addOptions(options.length ? options : [{ label: 'select a group before selecting content', value: '0' }])
    );
}

function makeNavigationRow(page, totalPages, windowIndex, ownerId) {
    const totalWindows = Math.max(1, Math.ceil(totalPages / PAGES_PER_WINDOW));
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`viewcopypasta:window:${windowIndex - 1}:${ownerId}`)
            .setLabel('◀ previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(windowIndex <= 0),
        new ButtonBuilder()
            .setCustomId(`viewcopypasta:window:${windowIndex + 1}:${ownerId}`)
            .setLabel('next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(windowIndex >= totalWindows - 1),
    );
}

function makeSendRow(page, group, selectedQuote, ownerId, sent = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`viewcopypasta:send:${page}:${group ?? -1}:${selectedQuote ?? -1}:${ownerId}`)
            .setLabel(sent ? '已發送' : '發送複製文')
            .setStyle(ButtonStyle.Success)
            .setDisabled(selectedQuote === null || sent)
    );
}

function makeEmbed(quotes, page, group, selectedQuote, notice = '') {
    const totalPages = Math.max(1, Math.ceil(quotes.length / ITEMS_PER_PAGE));
    const first = quotes.length ? page * ITEMS_PER_PAGE + 1 : 0;
    const last = Math.min((page + 1) * ITEMS_PER_PAGE, quotes.length);
    const embed = new EmbedBuilder()
        .setColor(0x9b2335)
        .setTitle('預覽')
        .setDescription(
            quotes.length
                ? 'preview the selected copypasta using the menus below, then send it to the channel.'
                : 'no content available'
        )
        .addFields(
            { name: 'amount', value: `共 **${quotes.length.toLocaleString()}** 篇`, inline: true },
            { name: 'range', value: quotes.length ? `**${first}–${last}**` : '—', inline: true },
            { name: 'page', value: `**${page + 1} / ${totalPages}**`, inline: true },
        );

    if (group !== null) {
        const groupFirst = page * ITEMS_PER_PAGE + group * ITEMS_PER_GROUP + 1;
        const groupLast = Math.min(groupFirst + ITEMS_PER_GROUP - 1, last);
        embed.addFields({ name: 'current', value: `**${groupFirst}–${groupLast}**`, inline: true });
    }

    if (selectedQuote !== null && quotes[selectedQuote] !== undefined) {
        const quote = quotes[selectedQuote];
        embed.addFields({
            name: `selected #${selectedQuote + 1}`,
            value: quote.length > 3900 ? `${quote.slice(0, 3897)}...` : quote,
            inline: false,
        });
    }

    if (notice) embed.setFooter({ text: notice });
    return embed;
}

function makeComponents(quotes, page, group, selectedQuote, windowIndex, ownerId, sent = false) {
    const totalPages = Math.max(1, Math.ceil(quotes.length / ITEMS_PER_PAGE));
    const rows = [
        makePageMenu(quotes, page, windowIndex, ownerId),
        makeGroupMenu(quotes, page, group, ownerId),
        makeContentMenu(quotes, page, group, selectedQuote, ownerId),
        makeSendRow(page, group, selectedQuote, ownerId, sent),
    ];
    if (totalPages > PAGES_PER_WINDOW) {
        rows.push(makeNavigationRow(page, totalPages, windowIndex, ownerId));
    }
    return rows;
}

function render(interaction, quotes, page, group, selectedQuote, ownerId, notice = '', sent = false) {
    const windowIndex = Math.floor(page / PAGES_PER_WINDOW);
    return interaction.update({
        embeds: [makeEmbed(quotes, page, group, selectedQuote, notice)],
        components: makeComponents(quotes, page, group, selectedQuote, windowIndex, ownerId, sent),
    });
}

module.exports = {
    name: 'viewcopypasta',
    description: '選擇特定複製文',
    options: [],

    callback: async (client, interaction) => {
        const quotes = getQuotes();
        const ownerId = interaction.user.id;
        const page = 0;
        const group = null;
        const selectedQuote = null;

        await interaction.reply({
            embeds: [makeEmbed(quotes, page, group, selectedQuote)],
            components: makeComponents(quotes, page, group, selectedQuote, 0, ownerId),
            ephemeral: true,
        });
    },

    component: async (client, interaction) => {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const ownerId = parts[parts.length - 1];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '請使用自己的選單',
                ephemeral: true,
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
        } else if (action === 'window') {
            const windowIndex = Number(parts[2]);
            page = windowIndex * PAGES_PER_WINDOW;
        } else if (action === 'send') {
            page = Number(parts[2]);
            group = Number(parts[3]);
            selectedQuote = Number(parts[4]);

            const quote = quotes[selectedQuote];
            if (!Number.isInteger(selectedQuote) || typeof quote !== 'string') {
                return render(interaction, quotes, 0, null, null, ownerId, '複製文不存在');
            }

            await interaction.deferUpdate();
            let sent = false;
            try {
                await interaction.channel.send({
                    content: quote.length > 2000 ? `${quote.slice(0, 1997)}...` : quote,
                });

                await interaction.deleteReply();
                return;
            } catch (error) {
                console.error('傳送失敗：', error);
                notice = '發送失敗 【機器人無法在dm中發送訊息】';
            }

            const windowIndex = Math.floor(page / PAGES_PER_WINDOW);
            return interaction.editReply({
                embeds: [makeEmbed(quotes, page, group, selectedQuote, notice)],
                components: makeComponents(
                    quotes,
                    page,
                    group,
                    selectedQuote,
                    windowIndex,
                    ownerId,
                    sent
                ),
            });
        } else {
            return;
        }

        page = Math.max(0, Math.min(page, totalPages - 1));

        if (
            group !== null &&
            (!Number.isInteger(group) || group < 0 || group >= GROUPS_PER_PAGE)
        ) {
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
