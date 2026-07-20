const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', '..', 'quotes.json');

function getQuotes() {
    try {
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, 'utf8');
        const quotes = JSON.parse(data);
        return Array.isArray(quotes) ? quotes : [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

function saveQuotes(quotes) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(quotes, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

module.exports = {
    name: 'removecopypasta',
    description: '刪除複製文',
    options: [
        {
            name: 'group',
            description: '如果要更改分類請重新輸入指令',
            type: 3, 
            required: true,
            autocomplete: true,
        },
        {
            name: 'content',
            description: '如果要更改分類請重新輸入指令',
            type: 3, 
            required: true,
            autocomplete: true,
        },
    ],

    autocomplete: async (client, interaction) => {
        try {
            const focusedOption = interaction.options.getFocused(true);
            const focusedValue = focusedOption.value.trim().toLowerCase();
            const allQuotes = getQuotes();
            const totalQuotes = allQuotes.length;
            const groupSize = 25;

            if (focusedOption.name === 'group') {
                const totalGroups = Math.ceil(totalQuotes / groupSize);
                let choices = [];

                for (let i = 0; i < totalGroups; i++) {
                    const start = i * groupSize + 1;
                    const end = Math.min((i + 1) * groupSize, totalQuotes);
                    choices.push({
                        name: `${start} ~ ${end}`,
                        value: `${start}-${end}` // 將區間範圍存進 value，方便給 content 讀取
                    });
                }

                // 如果使用者有輸入關鍵字，篩選分組名稱
                if (focusedValue) {
                    choices = choices.filter(c => c.name.toLowerCase().includes(focusedValue));
                }

                return await interaction.respond(choices.slice(0, 25));
            }

            if (focusedOption.name === 'content') {
                const groupValue = interaction.options.getString('group') || '';
                
                const mappedQuotes = allQuotes.map((quote, index) => ({
                    text: quote,
                    id: (index + 1).toString(),
                    index: index.toString()
                }));

                let targetQuotes = mappedQuotes;

                if (groupValue && groupValue.includes('-')) {
                    const [startStr, endStr] = groupValue.split('-');
                    const start = parseInt(startStr, 10);
                    const end = parseInt(endStr, 10);

                    targetQuotes = mappedQuotes.filter(item => {
                        const itemNum = parseInt(item.id, 10);
                        return itemNum >= start && itemNum <= end;
                    });
                }

                if (focusedValue) {
                    targetQuotes = targetQuotes.filter(item => 
                        item.text.toLowerCase().includes(focusedValue) || item.id.includes(focusedValue)
                    );
                }

                const choices = targetQuotes.slice(0, 25).map(item => ({
                    name: `${item.text}`.substring(0, 100),
                    value: item.index // 保持傳遞原始的陣列 index
                }));

                return await interaction.respond(choices);
            }

        } catch (error) {
            console.error(error);
        }
    },

    callback: async (client, interaction) => {
            try {
                const userInput = interaction.options.getString('content').trim();
                const allQuotes = getQuotes();
                
                let actualQuote = null;
                let targetIndex = null; // 用來記錄在原本陣列中的真正索引 (0-based)

                // 1. 如果使用者是透過自動補全點選（傳入的是 index 字串）
                if (/^\d+$/.test(userInput)) {
                    const num = parseInt(userInput, 10);
                    
                    // 優先判定是否為點選自動補全帶入的 0-based index
                    if (num >= 0 && num < allQuotes.length) {
                        actualQuote = allQuotes[num];
                        targetIndex = num;
                    } else {
                        // 防呆：如果是手動輸入 1-based ID
                        const indexFromId = num - 1;
                        if (indexFromId >= 0 && indexFromId < allQuotes.length) {
                            actualQuote = allQuotes[indexFromId];
                            targetIndex = indexFromId;
                        }
                    }
                }

                if (targetIndex === null) {
                    const cleanStr = (str) => str.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, '');
                    const cleanInput = cleanStr(userInput);
                    const foundIndex = allQuotes.findIndex(q => cleanStr(q).includes(cleanInput));
                    
                    if (foundIndex !== -1) {
                        actualQuote = allQuotes[foundIndex];
                        targetIndex = foundIndex;
                    }
                }


                allQuotes.splice(targetIndex, 1);

                const success = saveQuotes(allQuotes);

                if (success) {
                    let deletedText = actualQuote;
                    if (deletedText.length > 100) deletedText = deletedText.substring(0, 95) + '...';

                    await interaction.reply({
                        content: `已刪除語錄 ${deletedText}`,
                    });
                } else {
                    await interaction.reply({
                        content: '發生錯誤，請在試一次',
                        ephemeral: true
                    });
                }
        } catch (error) {
            console.error(error);
        }
    },
};