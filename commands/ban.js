const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Select a member and ban them.')
		.addUserOption(option =>
			option
				.setName('target')
				.setDescription('The member to ban')
				.setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false) //--preventing commands to be avaible in DM --
		.addStringOption(option =>
			option
				.setName('reason')
				.setDescription('The reason for banning'))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setDMPermission(false),

    async execute(interaction) {

		const target = interaction.options.getUser('target');
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		await interaction.reply({ content: `Banning ${target.username} for reason: ${reason}`, ephemeral: true });
		await interaction.guild.members.ban(target);
		//await wait(4000);
		//await interaction.guild.members.unban(target); //--- UNBANNING AFTER 4 SEC ---
    },
};