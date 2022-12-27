const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Captcha } = require('captcha-canvas');
const { writeFileSync } = require('fs');
const discordTranscripts = require('discord-html-transcripts');

const wait = require('node:timers/promises').setTimeout;

let captchaText;

module.exports = {

    name: Events.InteractionCreate,
    async execute(interaction){

		//if(!interaction.isButton()) return

        if(interaction.isButton()){
			
			if(interaction.customId === 'primary') {
				interaction.update({ content: `You've clicked submit button!`, ephemeral: true, components: [] }); //-- REMOVING THE BUTTONS --
			} else if (interaction.customId === 'danger') {
				interaction.reply({ content: `You've clicked cancel button!`, ephemeral: true });
			};

		//--- FOR TICKET CREATION ---

			if(interaction.customId === 'ticketCreate'){

				const openTicket = interaction.guild.channels.cache.some(channel => channel.name === `ticket-${interaction.user.username}`);

				if(openTicket){

					await interaction.reply({
						content: 'You have already opened a ticket',
						ephemeral: true,

					}).then(async () => {
						await wait(5000);
						await interaction.deleteReply();
					})

				} else {

					const modal = new ModalBuilder()
					.setCustomId('ticketModal')
					.setTitle('Create Ticket')

					const ticket = new TextInputBuilder()
					.setCustomId('ticketInput')
					.setLabel("Concern")
					.setStyle(TextInputStyle.Paragraph);

					const ticketRow = new ActionRowBuilder().addComponents(ticket);
					modal.addComponents(ticketRow);

					await interaction.showModal(modal)

				};
			};
		
			//--- FOR CLOSING A TICKET ---
			if(interaction.customId === 'closeButton'){

				try {

					const ticketToClose = interaction.guild.channels.cache.find(channel => channel.name === `ticket-${interaction.user.username}`);

					console.log(ticketToClose);

					const attachment = await discordTranscripts.createTranscript(ticketToClose);

					const transcriptsChannel = await interaction.guild.channels.cache.find(channel => channel.id === '1056850849671938048')

					transcriptsChannel.send({
						content: `Ticket close by ${interaction.user}`,
						files: [attachment]
					})

					interaction.reply({
						content: `Closing the ticket in a few seconds`,
						ephemeral: false,
					}).then(async () => {

						await wait(5000);
						await interaction.channel.delete()

					})
					
				} catch(error) {
					console.error(error);
				}
			};
			

		//--- FOR VERIFY ---
			if(interaction.customId === 'verify') {

			// --- RANDOM CAPTCHA ----
				const captcha = new Captcha(); //create a captcha canvas of 100x300.
				captcha.async = false //Sync
				captcha.addDecoy(); //Add decoy text on captcha canvas.
				captcha.drawTrace(); //draw trace lines on captcha canvas.
				captcha.drawCaptcha(); //draw captcha text on captcha canvas.

				writeFileSync('captcha.png', captcha.png); //create 'captcha.png' file in your directory.
				
				captchaText = captcha.text;
				
				console.log(captchaText);

				const captchaEmbed = new EmbedBuilder()
				.setTitle(`**Hello! Let's find out if you're a human.**`)
				.setDescription('`Please type the captcha below to be able to access this server!`')
				.setColor('#020303')
				.setImage('attachment://captcha.png')
				.setFooter({text: 'Verification Period: 1 minute'})

				const file = new AttachmentBuilder('./captcha.png')

				const row = new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setCustomId('answerMe')
							.setLabel('Answer')
							.setStyle(ButtonStyle.Success),
					);
				
				await interaction.reply({
					embeds: [captchaEmbed],
					files: [file],
					ephemeral: true,
					components: [row],
				}).then(async () => {
					await wait(60000);
					await interaction.deleteReply();
				})
		    };

			if(interaction.customId === 'answerMe'){

				const modal = new ModalBuilder()
				.setCustomId('captchaAnswer')
				.setTitle('Captcha Answer')

				const answer = new TextInputBuilder()
				.setCustomId('answerInput')
				.setLabel("ANSWER")
				.setStyle(TextInputStyle.Short);

				const answerRow = new ActionRowBuilder().addComponents(answer);
				modal.addComponents(answerRow);

				await interaction.showModal(modal)
			};
        };

		if(interaction.isModalSubmit()){
			// -- FOR VERIFICATION --
			if(interaction.customId === 'captchaAnswer'){

				const captchaAnswer = interaction.fields.getTextInputValue('answerInput')
				if(captchaAnswer !== captchaText){

					const embedReply = new EmbedBuilder()
					.setDescription('Incorrect captcha! Please try again.')
					.setColor('#020303')

					await interaction.reply({
						embeds: [embedReply], 
						ephemeral: true 
					}).then(async () => {
						await wait(5000);
						await interaction.deleteReply();
					})
				} else {

					const role = interaction.guild.roles.cache.find(r => r.name === 'member');
					await interaction.member.roles.add(role); // assigning a role member
					
					const embedReply = new EmbedBuilder()
					.setDescription(`You're now verified`)
					.setColor('#020303')

					await interaction.reply({
						embeds: [embedReply], 
						ephemeral: true 
					}).then(async () => {
						await wait(5000);
						await interaction.deleteReply();
					})
				}
				
			};
		}
    }
};