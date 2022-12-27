const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

const modal = new ModalBuilder()
    .setCustomId('myModal')
    .setTitle('My Modal')

// Create the text input components
const favoriteColorInput = new TextInputBuilder()
    .setCustomId('favoriteColorInput')
    // The label is the prompt the user sees for this input
    .setLabel("What's your favorite color?")
    // Short means only a single line of text
    .setStyle(TextInputStyle.Short);

const hobbiesInput = new TextInputBuilder()
    .setCustomId('hobbiesInput')
    .setLabel("What's some of your favorite hobbies?")
    // Paragraph means multiple lines of text.
    .setStyle(TextInputStyle.Paragraph);

// An action row only holds one text input,
// so you need one action row per text input.
const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

// Add inputs to the modal
modal.addComponents(firstActionRow, secondActionRow);

module.exports = {

    data : new SlashCommandBuilder()
        .setName('report')
        .setDescription('Submit a report.'),
    async execute(interaction) {
        const isAdmin = interaction.member.roles.cache.some(r => r.name === 'Admin'); //--- CHECKING IF THERE'S AN ADMIN ROLE ---

        //const admin = interaction.member.roles.cache.find(r => r.name === 'Admin');

		if (!isAdmin) {
            const embedReply = new EmbedBuilder()
				.setDescription('Only admin can use this command.')
				.setColor('#020303')
			await interaction.reply({
                embeds: [embedReply],
                ephemeral: true,
            })
		} else {
            await interaction.showModal(modal);
        }
    }

};