const fs = require('node:fs');
const path = require('node:path');
const { token, uri } = require('./config.json')
const { Events, Client, Collection, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require(`discord.js`);
const client = new Client({ 
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.MessageContent
	] 
});

const { connect, connection } = require('mongoose');
const Conversation = require('././schema/Conversation');

const { ask } = require("./openAI.js");

const wait = require('node:timers/promises').setTimeout;

//-- FOR AI CONVERSATION --
//let conversationHistory = "";

//---- for dynamically retrieving command files ----
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

//---- for dynamically retreiving event files ----
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
		// if(event.once) connection.once(event.name, (...args) => event.execute(...args, client))
		// else connection.on(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	};
}


client.on('messageCreate', async msg => {

//--- FOR ANNOUNCEMENT POST---
	if(msg.content === '!announce' && msg.author.id === '990875572282490924') {

		const channel = client.channels.cache.get('1057524841680482324');

		const announce = channel.messages.cache.last();

		const announceEmbed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setDescription(`${announce}`)
		.setThumbnail('https://media4.giphy.com/media/nBIQVDXIXWUTabDrUL/giphy.gif?cid=790b7611153fb62b1f9f05130f65079a20f6e86d35ac7b1f&rid=giphy.gif&ct=g')


		msg.guild.channels.cache.find(i => i.name === '📢-announcement').send({
			embeds: [announceEmbed]
		})

	}

//--- FOR INFO POST IN VERIFCATION CHANNEL---
	if(msg.content === '!info' && msg.author.id === '990875572282490924') {
		const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setDescription(`If you're experiencing any errors with the verification:
		**Please wait for the 1 minute to expire and try again.**`)
		.setThumbnail('https://media3.giphy.com/media/oe30whGbJsZh2hyGB5/giphy.gif?cid=ecf05e47vfo1r81w4iulzw2dwjc20gu6zdw72yfgjglpwv5j&rid=giphy.gif&ct=g')

		msg.channel.send({
			embeds: [embed]
			
		})
	};

//--- FOR VERIFICATION CHANNEL POST---
	if(msg.content === '!verify' && msg.author.id === '990875572282490924') {
		const row = new ActionRowBuilder()
    	.addComponents(
			new ButtonBuilder()
				.setCustomId('verify')
				.setLabel('Verify')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('✅'),
    	);

		const embed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('⛔️ Verification Required! ⛔️')
			.setDescription('To access `BrandlessPH`, you need to pass the verification first.\n\nPress on the `verify` button below.');

		msg.channel.send({ 
				ephemeral: false,
				embeds: [embed],
				components: [row]
			});
	};

//--- FOR TICKET CHANNEL POST ---
	if(msg.content === '!ticket' && msg.author.id === '990875572282490924') {

		const ticketRow = new ActionRowBuilder()
    	.addComponents(
			new ButtonBuilder()
				.setCustomId('ticketCreate')
				.setLabel('Create Ticket')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('☎️'),
    	);

		const ticketEmbed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('Open ticket')
		.setDescription('To create a ticket, click on the `Create Ticket` button')
		.setThumbnail('https://media2.giphy.com/media/PfhDVTbCOsBxOMzemc/giphy.gif?cid=790b761199d506d04f0cee87ec5e42e315c015e6415cc589&rid=giphy.gif&ct=g')

		msg.channel.send({ 
				ephemeral: false,
				embeds: [ticketEmbed],
				components: [ticketRow]
		});
	};

//--- FOR RULES POST ---
	if(msg.content === '!rules' && msg.author.id === '990875572282490924'){

		const rulesEmbed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('**SERVER RULES**')
		.setDescription(
			`Welcome to the **BrandlessPH Server** Discord community! In order to keep this community a safe and enjoyable place for everyone, we ask that all members adhere to the following rules:

			1. Be respectful to others. No harassment, bullying, or discrimination of any kind will be tolerated.
			2. Keep conversations and content appropriate for all audiences. No explicit or NSFW content is allowed.
			3. Do not spam or flood the chat with unnecessary messages.
			4. Do not share personal information about yourself or others.
			5. Do not share illegal content or engage in any illegal activities.
			6. Follow the specific rules and guidelines for each individual channel.
			
			If you are found to be in violation of these rules, you may receive a warning or be banned from the server at the discretion of the moderators.
			
			We appreciate your cooperation in helping to create a positive and welcoming community for everyone. Thank you for your understanding and support.
			`
		)

		msg.channel.send({
			embeds: [rulesEmbed]
		})

	};

//--- FOR ROLES POST ---
	if(msg.content === '!roles' && msg.author.id === '990875572282490924') {

		const rolesRow = new ActionRowBuilder()
		.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('roles')
				.setPlaceholder('Pick a role...')
				.setMinValues(1)
				.setMaxValues(1)
				.addOptions(
					{
						label: '💻 Developer',
						value: 'developer'
					},
					{
						label: '😎 Client',
						value: 'client'
					},
				),	
    	)

		const pronouns = new ActionRowBuilder()
		.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('pronouns')
				.setPlaceholder('Pick your pronouns...')
				.setMinValues(1)
				.setMaxValues(1)
				.addOptions(
					{
						label: 'he/him',
						value: 'he/him'
					},
					{
						label: 'she/her',
						value: 'she/her'
					},
					{
						label: 'they/them',
						value: 'they/them'
					},
				),	
    	)

		const location = new ActionRowBuilder()
		.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('location')
				.setPlaceholder('Pick your location...')
				.setMinValues(1)
				.setMaxValues(1)
				.addOptions(
					{
						label: '🍜 asia',
						value: 'asia'
					},
					{
						label: '💶 europe',
						value: 'europe'
					},
					{
						label: '🇺🇸 americas',
						value: 'americas'
					},
				),	
    	)

		const rolesEmbed = new EmbedBuilder()
		.setTitle(`📢 Tell us who you are
		`)
		.setDescription(`If you're interested in our services or just want to hang out, we have the perfect badge for you! Select which role and pronouns best describes you and choose your location.`)
		.setThumbnail('https://media0.giphy.com/media/U57FlRKoH2QwnKOEuG/giphy.gif?cid=790b761134031d63683333f481d8b84f9727acfda6431fa1&rid=giphy.gif&ct=g')

		await msg.channel.send({
			embeds: [rolesEmbed],
			components: [rolesRow, pronouns, location],
			ephemeral: false,
		})


	};

//--- FOR OPENAI CHAT POST ---

	// if(msg.content === '!ai' && msg.author.id === '990875572282490924') {

	// 	const AIRow = new ActionRowBuilder()
    // 	.addComponents(
	// 		new ButtonBuilder()
	// 			.setCustomId('chatAI')
	// 			.setLabel('Chat')
	// 			.setStyle(ButtonStyle.Secondary)
	// 			.setEmoji('🤖'),
    // 	);

	// 	const AIEmbed = new EmbedBuilder()
	// 	.setColor(0x0099FF)
	// 	.setTitle('Chat with AI')
	// 	.setDescription('To chat with the AI, click on the `Chat` button')
	// 	.setThumbnail('https://assets.objkt.media/file/assets-003/QmU2qd1BJC51uvLPdCUjkaVRRHkAMNbrswHs51BzeY1ss6/artifact')

	// 	msg.channel.send({ 
	// 			ephemeral: false,
	// 			embeds: [AIEmbed],
	// 			components: [AIRow]
	// 	});

	// }


	const AIChannel = '1048072739350646875';

	if(msg.channel.id === AIChannel){
			
		if (msg.author.bot) return;

		Conversation.findOne({ userID: `${msg.author.id}`}).then(async result => {

			if(result === null){
				Conversation.create({ userID: `${msg.author.id}`, conversation: [{ messageContent: `${msg.content}` }] })
				.then( result =>{
					result.conversation.forEach(async (message) => {
						console.log(message.messageContent);

						const prompt = `Respond correctly based on ${message.messageContent} in  a polite mannerly.`;
						const answer = await ask(prompt); //prompt GPT-3

						const resetButton = new ActionRowBuilder()
						.addComponents(
							new ButtonBuilder()
								.setCustomId('reset')
								.setLabel('🗣️ Reset Convo')
								.setStyle(ButtonStyle.Primary),
						);
			
						await msg.reply({
							content: answer,
							components: [resetButton],
						});
					})
				})
			} else {

				Conversation.updateOne(
					{ userID: `${msg.author.id}` },
					{ $push: { conversation: { messageContent: `${msg.content}` } } },
					function(err, res) {
					  if (err) throw err;
					}
				);

				const prompt = `Pretend to be an AI chat bot that responds to a person in a conversation. Be polite, lively, and positive with your responses.
				
				Person: Good day bot.
				bot: Hi. Good day to you too.
				
				Person: How are you doing?
				bot: I'm doing great. Thanks for asking. How are you doing?

				Person: I'm doing great as well. What else can you do?
				bot: I can answer anything you'd like to ask me.
				
				Person: ${msg.content}
				bot:`;

				const answer = await ask(prompt); //prompt GPT-3

				const resetButton = new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('reset')
						.setLabel('🗣️ Reset Convo')
						.setStyle(ButtonStyle.Primary),
				);
	
				await msg.reply({
					content: answer,
					components: [resetButton],
				});


				// if(msg.content !== null){

				// 	// Fetch all messageContent properties
				// 	await Conversation.find({}, 'conversation.messageContent', async function(err, conversations) {
				// 		if (err) throw err;
					
				// 		// Flatten the array of messageContent properties
				// 		const messageContent = conversations.flatMap(conversation => conversation.conversation.map(obj => obj.messageContent));
				// 		console.log(messageContent);

				// 		const latestPrompt = messageContent[messageContent.length-1];

				// 		console.log(latestPrompt);
						
				// 		const prompt = `Pretend to be an AI chat bot that responds to a person in a conversation.
						
				// 		Person: Good day bot.
				// 		bot: Hi. Good day to you too.
						
				// 		Person: How are you doing?
				// 		bot: I'm doing great. Thanks for asking. How are you doing?

				// 		Person: I'm doing great as well. What else can you do?
				// 		bot: I can answer anything you'd like to ask me.
						
				// 		Person: ${latestPrompt}
				// 		bot:`;

				// 		const answer = await ask(prompt); //prompt GPT-3

				// 		const resetButton = new ActionRowBuilder()
				// 		.addComponents(
				// 			new ButtonBuilder()
				// 				.setCustomId('reset')
				// 				.setLabel('🔄 reset')
				// 				.setStyle(ButtonStyle.Primary),
				// 		);
			
				// 		await msg.reply({
				// 			content: answer,
				// 			components: [resetButton],
				// 	});
				// });

				// }
			}
		})

	} else {

		if (msg.author.bot) return;

	}
});

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isButton()){

		if(interaction.customId === 'reset') {

			// Create a filter to find the documents you want to delete
			const filter = { userID: `${interaction.user.id}` };

			// Delete the documents
			Conversation.deleteMany(filter, function (err) {
				if (err) return handleError(err);
			// deleted at most one tank document
			});

			await interaction.reply({
				content: `${interaction.user}, conversation has been reset!`,
				ephemeral: true,
			}).then(async () => {

				await wait(5000);
				await interaction.deleteReply()

			});
		};
	};
});



//client.login(process.env.token);
client.login(token);
(async () => {
	await connect(uri).catch(console.error)
})();