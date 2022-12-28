const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const row = new ActionRowBuilder()
    .addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select')
            .setPlaceholder('Nothing selected')
            .setMinValues(2) //-- SETTING MIN. AMOUNT OF OPTIONS THAT CAN BE SELECTED --
			.setMaxValues(3) //-- SETTING MAX. AMOUNT OF OPTIONS THAT CAN BE SELECTED --
            .addOptions(
                {
                    label: 'Select me',
                    description: 'This is a description',
                    value: 'first',
                },
                {
                    label: 'You can select me too',
                    description: 'This is also a description',
                    value: 'second',
                },
                {
                    label: 'Finally',
                    description: 'This is also a description',
                    value: 'third',
                },
            ),
    )

module.exports = {

    data : new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Select an item from the menu.'),
    async execute(interaction) {

        await interaction.reply({ content: 'menu', components: [row] })

        if (interaction.isStringSelectMenu()) {

			if(interaction.customId === 'select'){

				const selected = interaction.values.join(', ');

				await interaction.reply({ content: 'Something was selected!', components: [] }); //---- REMOVING THE MENU ----


				if(selected){
					await interaction.editReply(`The user selected: ${selected}`);
				};
			};
        }
    }

};