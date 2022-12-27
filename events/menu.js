const { Events } = require("discord.js");

module.exports = {

    name: Events.InteractionCreate,
    async execute(interaction) {

        //---- INTERACTION FOR MENU ----
        if(!interaction.isStringSelectMenu()) return

		if (interaction.isStringSelectMenu()) {

			if(interaction.customId === 'select'){

				const selected = interaction.values.join(', ');

				await interaction.reply({ content: 'Something was selected!', components: [] }); //---- REMOVING THE MENU ----


				if(selected){
					await interaction.editReply(`The user selected: ${selected}`);
				};
			};
		};
    }

}