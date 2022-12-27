const { SlashCommandBuilder } = require('discord.js');

module.exports = {

    data : new SlashCommandBuilder()
        .setName('guide')
        .setDescription('Search discordjs.guide!')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Phrase to search for')
                .setAutocomplete(true)),
    async autocomplete(interaction) {
        // const focusedValue = interaction.options.getFocused();
        // const choices = ['Popular Topics: Threads', 'Sharding: Getting started', 'Library: Voice Connections', 'Interactions: Replying to slash commands', 'Popular Topics: Embed preview'];
        // const filtered = choices.filter(choice => choice.startsWith(focusedValue));
        // await interaction.respond(
        //     filtered.map(choice => ({ name: choice, value: choice })),
        // );

        //--- HANDLING MULTIPLE AUTOCOMPLETE OPTIONS ----
        const focusedOption = interaction.options.getFocused(true);
		let choices;

		if (focusedOption.name === 'query') {
			choices = ['Popular Topics: Threads', 'Sharding: Getting started', 'Library: Voice Connections', 'Interactions: Replying to slash commands', 'Popular Topics: Embed preview'];
		}

		if (focusedOption.name === 'version') {
			choices = ['v9', 'v11', 'v12', 'v13', 'v14'];
		}

		const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
    },

};