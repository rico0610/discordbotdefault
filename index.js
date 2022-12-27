const fs = require('node:fs');
const path = require('node:path');
//const { token } = require('./config.json')
const { Client, Collection, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require(`discord.js`);
const client = new Client({ 
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.MessageContent
	] 
});
const { ask } = require("./openAI.js");

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
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.on('messageCreate', async msg => {

//--- FOR VERIFY CHANNEL ---	
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

//--- FOR TICKET CHANNEL ---
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
		.setDescription('To create a ticket, click on the `Create Ticket` button');

		msg.channel.send({ 
				ephemeral: false,
				embeds: [ticketEmbed],
				components: [ticketRow]
		});
	};

//--- FOR RULES ---
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

//--- FOR OPENAI CHAT ---
	const AIChannel = '1057186168980119632';

	if(msg.channel.id === AIChannel){

			if (msg.author.bot) return;

			const prompt = `Act like a virtual assistant and respond to ${msg.content}`;
			const answer = await ask(prompt); //prompt GPT-3
	
			await msg.reply(answer);

	} else {

		if (msg.author.bot) return;

	}
})



client.login(process.env.token);