const { Events, EmbedBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const Canvas = require('@napi-rs/canvas');
const { request } = require("node:https");
const wait = require('node:timers/promises').setTimeout;

module.exports = {

    name: Events.InteractionCreate,
    async execute(interaction) {
        //---- INTERACTION FOR MODAL ----
		if(!interaction.isModalSubmit()) return;

		if(interaction.isModalSubmit()) {
				
			if (interaction.customId === 'myModal') {
				await interaction.reply({ content: 'Your submission was received successfully!', ephemeral: true });

				// Get the data entered by the user
				const favoriteColor = interaction.fields.getTextInputValue('favoriteColorInput');
				const hobbies = interaction.fields.getTextInputValue('hobbiesInput');
				console.log({ favoriteColor, hobbies });
			};


//-- FOR TICKET SYSTEM --
			if(interaction.customId === 'ticketModal') {

				const embedReply = new EmbedBuilder()
				.setDescription(`${interaction.user} thanks for opening a ticket. Someone from our team will be with you shortly.`)
				.setColor('#020303')

				interaction.reply({
					embeds: [embedReply],
					ephemeral: true
				}).then(async () => {
					await wait(5000);
					await interaction.deleteReply();
				})

				const ticketInput = interaction.fields.getTextInputValue('ticketInput'); //-- getting the input
				const categoryId = '1056070016803549254';
				const modRoleId = '1056831538349752351';
				const everyoneId = '1056069438564220999';

				// Create the channel
				await interaction.guild.channels.create({
					name: `ticket-${interaction.user.username}`,
					type: ChannelType.GuildText,
					parent: categoryId, // category
					permissionOverwrites: [
						{
							id: everyoneId,
							deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.CreateInstantInvite],
						},
						{
							id: modRoleId,
							allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.CreateInstantInvite]
						},
						{
							id: interaction.user.id,
							allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
							deny: [PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.CreatePrivateThreads, PermissionsBitField.Flags.ManageMessages]
						},
					],
				}).then(async ticketChannel => {

					const embedReply = new EmbedBuilder()
					.setTitle('**Concern:**')
					.setDescription(`${ticketInput}`)
					.addFields(
						{name: 'Reporter', value: `${interaction.user}`},
						{name: '\u200B', value: '\u200B'},
					)
					.setColor('#020303')
					.setThumbnail('https://i.imgur.com/wGWdsT7.png')
					.setFooter({ text: 'BrandlessPH', iconURL: 'https://i.imgur.com/wGWdsT7.png' })

					const row = new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setCustomId('closeButton')
							.setLabel('close')
							.setStyle(ButtonStyle.Danger),
					)

					const mod = interaction.guild.roles.cache.find(r => r.name === 'moderator');
					const admin = interaction.guild.roles.cache.find(r => r.name === 'Admin');

					//-- SENDING THE TICKET INPUT TO THE CREATED CHANNEL --

					ticketChannel.send({
						content: `Here's your ticket ${interaction.user}. Please check ${admin} ${mod}`,
						embeds: [embedReply],
						ephemeral: false,
						components: [row]
					}).then((msg) => msg.pin())
				})
			};
		}
    }
}