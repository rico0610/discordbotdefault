const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const row = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('verify')
            .setLabel('verify')
            .setStyle(ButtonStyle.Primary),
    );

const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('⛔️ Verification Required! ⛔️')
    .setDescription('To access `BrandlessPH`, you need to pass the verification first.\n\nPress on the `verify` button below.');

module.exports = {

	data: new SlashCommandBuilder()
		.setName('verify')
		.setDescription('For members verification!')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers),
	async execute(interaction) {
		await interaction.reply({ 
            ephemeral: false,
            embeds: [embed],
            components: [row]
        });
	},
	
};