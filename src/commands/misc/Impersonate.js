const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'impersonate',
    description: '仿冒特定成員',
    options: [
        {
            name: 'target',
            description: 'memeber',
            type: 6,
            required: true,
        },
        {
            name: 'content',
            description: 'content',
            type: 3,
            required: true,
        },
    ],

    callback: async (client, interaction) => {
        const LOG_CHANNEL_ID = '1527034223368601830';

        const targetUser = interaction.options.getUser('target');
        const message = interaction.options.getString('content'); 
        const channel = interaction.channel;

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        const displayName = member ? member.displayName : targetUser.username;
        const avatarURL = member ? member.displayAvatarURL({ forceStatic: false }) : targetUser.displayAvatarURL({ forceStatic: false });

        await interaction.deferReply({ ephemeral: true });

        let webhook;
        try {
            webhook = await channel.createWebhook({
                name: displayName,
                avatar: avatarURL,
                reason: `cmd`
            });

            await webhook.send({
                content: message,
            });
            
            await interaction.deleteReply();

            const logEmbed = new EmbedBuilder()
                .setColor('#6d0000')
                .addFields(
                    { name: 'User', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: 'Target', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Content', value: message || '*none*' },
                )
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.guild.name} | ${interaction.channel.name}`, 
                });

            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error(error);
        } finally {
            if (webhook) {
                await webhook.delete().catch(err => console.error(err));
            }
        }
    },
};