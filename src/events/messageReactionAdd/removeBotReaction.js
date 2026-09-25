module.exports = async (client, reaction, user) => {
    if (!user.bot || user.id === client.user.id) return;

    try {
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        await reaction.users.remove(user.id);
    } catch (error) {
        console.error(error);
    }
};