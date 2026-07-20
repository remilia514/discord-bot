module.exports = {
    name: 'choice',
    description: '二選一',
    options: [
        {
            name: 'content',
            description: '前言',
            type: 3, 
            required: true,
        },
        {
            name: 'first',
            description: '第一項',
            type: 3, 
            required: true,
        },
        {
            name: 'second',
            description: '第二項',
            type: 3, 
            required: true,
        },
    ],

    callback: async (client, interaction) => {
        const content = interaction.options.getString('content');
        const firstChoice = interaction.options.getString('first');
        const secondChoice = interaction.options.getString('second');

        const choices = [firstChoice, secondChoice];
        const prediction = choices[Math.floor(Math.random() * choices.length)];

        await interaction.reply(`${content} **${prediction}**`);
    },
};