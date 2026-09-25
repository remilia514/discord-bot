module.exports = async (client, reaction, user) => {
    if (!user.bot || user.id === client.user.id) return;

    try {
        await reaction.users.remove(user.id);
    } catch (error) {
        console.error(error);
    }
};