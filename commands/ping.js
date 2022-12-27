const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const wait = require('node:timers/promises').setTimeout;

module.exports = {

	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with pong!'),
	async execute(interaction) {
		await interaction.reply('pong!');

		// const message = await interaction.fetchReply(); //-- FOR FETCHING THE REPLY ---
		// console.log(message.content);
		// await interaction.deleteReply(); // --- FOR DELETING REPLY ---
		// await wait(2000);
		// await interaction.followUp('Pong again!'); // --- FOR SENDING FOLLOW UP MESSAGE. EPHEMERAL CAN BE ADDED HERE AS WELL ---
		// await interaction.editReply({ content: 'Secret Pong!', ephemeral: true }); //--- EDITING RESPONSE ---
			//await interaction.reply({ content: 'Secret Pong!', ephemeral: true }); //--- HIDE RESPONSE EXCEPT TO EXECUTOR OF THE SLASH COMMAND ---

	//-- IF COMMANDS PERFORM LONGER TASKS (MORE THAN 3 SECONDS), USE THIS --

		// await interaction.deferReply(); //--- EPHEMERAL CAN BE ADDED HERE AS WELL ---
		// await wait(4000);
		// await interaction.editReply('Pong!');

	//-- FOR LOCALIZED RESPONSES --
		// const locales = {
		// 	pl: 'Witaj Świecie!',
		// 	de: 'Hallo Welt!',
		// };
		// interaction.reply(locales[interaction.locale] ?? 'Hello World (default is english)');
	},
	
};