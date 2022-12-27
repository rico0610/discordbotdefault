const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const row = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('primary')
            .setLabel('submit')
            .setStyle(ButtonStyle.Primary),
            //.setDisabled(true)
            //.setEmoji()
        new ButtonBuilder()
            .setCustomId('danger')
            .setLabel('cancel')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setLabel('Discord.js link')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.js.org')
    );

const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Some title')
    .setURL('https://discord.js.org')
    .setDescription('Some description here');

module.exports = {

	data: new SlashCommandBuilder()
		.setName('button')
		.setDescription('buttons!'),
	async execute(interaction) {

		await interaction.reply({ 
            content:'buttons!',
            ephemeral: true,
            embeds: [embed],
            components: [row]
        });
	},
	
};