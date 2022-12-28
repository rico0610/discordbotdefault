const { Events } = require("discord.js");

const wait = require('node:timers/promises').setTimeout;

module.exports = {

    name: Events.InteractionCreate,
    async execute(interaction) {

        //---- INTERACTION FOR MENU ----
        if(!interaction.isStringSelectMenu()) return

		if (interaction.isStringSelectMenu()) {

			if(interaction.customId === 'select'){

				const selected = interaction.values.join(', ');

				await interaction.deferUpdate();
				await wait(4000);
				await interaction.reply({ content: 'Something was selected!', components: [] }); //---- REMOVING THE MENU ----


				if(selected){
					await wait(10000);
					await interaction.editReply(`The user selected: ${selected}`);
				};
			};

		//-- FOR ROLES --

			// roles
			if(interaction.customId === 'roles') {

				const selected = interaction.values.join(', ');

				await interaction.reply({ 
					content: `You've selected ${selected}`,
					components: [],
					ephemeral: true
				}).then(async () => {
					await wait(2000);
					await interaction.deleteReply();
				})

				const developerRole = interaction.guild.roles.cache.find(r => r.name === 'developer');
				const clientRole = interaction.guild.roles.cache.find(r => r.name === 'client');

				if(selected === developerRole.name) {
					await interaction.member.roles.add(developerRole);
					await interaction.member.roles.remove(clientRole);
				} else if(selected === clientRole.name) {
					await interaction.member.roles.add(clientRole);
					await interaction.member.roles.remove(developerRole);
				}
			}

			// pronouns
			if(interaction.customId === 'pronouns') {

				const selected = interaction.values.join(', ');

				await interaction.reply({ 
					content: `You've selected ${selected}`, 
					ephemeral: true
				}).then(async () => {
					await wait(2000);
					await interaction.deleteReply();
				})

				const heRole = interaction.guild.roles.cache.find(r => r.name === 'he/him');
				const sheRole = interaction.guild.roles.cache.find(r => r.name === 'she/her');
				const theyRole = interaction.guild.roles.cache.find(r => r.name === 'they/them');

				if(selected === heRole.name) {
					await interaction.member.roles.add(heRole);
					await interaction.member.roles.remove(sheRole);
					await interaction.member.roles.remove(theyRole);
				} else if(selected === sheRole.name) {
					await interaction.member.roles.add(sheRole);
					await interaction.member.roles.remove(heRole);
					await interaction.member.roles.remove(theyRole);
				} else if(selected === theyRole.name) {
					await interaction.member.roles.add(theyRole);
					await interaction.member.roles.remove(heRole);
					await interaction.member.roles.remove(sheRole);
				}
			}

			// location
			if(interaction.customId === 'location') {

				const selected = interaction.values.join(', ');

				await interaction.reply({ 
					content: `You've selected ${selected}`, 
					ephemeral: true
				}).then(async () => {
					await wait(2000);
					await interaction.deleteReply();
				})

				const asiaRole = interaction.guild.roles.cache.find(r => r.name === 'asia');
				const europeRole = interaction.guild.roles.cache.find(r => r.name === 'europe');
				const americasRole = interaction.guild.roles.cache.find(r => r.name === 'americas');

				if(selected === asiaRole.name) {
					await interaction.member.roles.add(asiaRole);
					await interaction.member.roles.remove(europeRole);
					await interaction.member.roles.remove(americasRole);
				} else if(selected === europeRole.name) {
					await interaction.member.roles.add(europeRole);
					await interaction.member.roles.remove(asiaRole);
					await interaction.member.roles.remove(americasRole);
				} else if(selected === americasRole.name) {
					await interaction.member.roles.add(americasRole);
					await interaction.member.roles.remove(asiaRole);
					await interaction.member.roles.remove(europeRole);
				}
			}
		};
    }

}