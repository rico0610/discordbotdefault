const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {

    data : new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Select a member and kick them.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');

        await interaction.reply({ content:`Kicked ${target.username}`, ephemeral: true });
        await interaction.guild.members.kick(target);
    },
};