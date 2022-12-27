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
    }

};