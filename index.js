const fs = require("node:fs");
const path = require("node:path");
const { connect } = require("mongoose");
const Canvas = require("@napi-rs/canvas");
const { request } = require("undici");
const userLevel = require("./levelSchema/userLevel");
const conversation = require("./conversationSchema/conversation");
const stickySchema = require("./stickySchema/sticky");
const faqs = require("./faqSchema/faqs");
const firstResponse = require("./firstResponseSchema/firstResponse");
const https = require("https");
const { ask } = require("./openAI.js");
const wait = require("node:timers/promises").setTimeout;
//const InviteData = require("./inviteSchema/invite");
// const spawner = require("child_process").spawn; // for passing string data
const {
  initPinecone,
  createIndex,
  upsertVectors,
  queryIndex,
} = require("./AIconversation.js");

const { googleSearch } = require("./google.js");

// const {
//   token,
//   uri,
//   bearerToken,
//   //tweeterUsername,
// } = require("./config.json");

//const Twit = require("twitter-v2");

// const T = new Twit({
//   //consumer_key: consumerKey,
//   //consumer_secret: consumerSecret,
//   //bearer_token: bearerToken,
//   //access_token_key: accessToken,
//   //access_token_secret: accessTokenSecret,
// });

const {
  Events,
  Client,
  Collection,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder,
  Partials,
  MessageReaction,
  Sticker,
} = require(`discord.js`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    2048,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Replace with your actual guild and channel ID
const guildId = "1056069438564220999";
const channelId = "1059713593534324746";
const gameChannel = "1057293089183629342";
const channelForCheckingLevel = "1060421595702767616";
const errorChannelId = "1054312191689510983";
let errorChannel;
// const AIChannelId = "1057559988840701952";
// const botControlChannelId = "1070614249392578570";
const AIChannelId = "1069876640877920327"; //-for testing
const botControlChannelId = "1054312191689510983"; //-for testing
const timeouts = new Map();
let vectorChannel;

// create the client.on ready
client.on(Events.ClientReady, async () => {
  initPinecone();
  errorChannel = await client.channels.fetch(errorChannelId);
  vectorChannel = client.channels.cache.get("1054312191689510983");
});

//---- for dynamically retrieving command files ----
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

//---- for dynamically retreiving event files ----
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
    // if(event.once) connection.once(event.name, (...args) => event.execute(...args, client))
    // else connection.on(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

//-----------------------------------------------------------------------------------------------------------

let coinSide;

//--- FOR TIC-TAC-TOE GAME -----
// The board is represented as a 2D array, with 'X', 'O', and ''
// representing the different states a cell can be in
let board = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
];

// Set the current player to 'X'
let currentPlayer = "X";

// Set the last player to ''
let lastPlayer = "";

// Set the bot's symbol to 'O'
const botSymbol = "O";

// Function to check if the current player has won
function checkWin(player) {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (
      board[i][0] === player &&
      board[i][1] === player &&
      board[i][2] === player
    )
      return true;
  }
  // Check columns
  for (let i = 0; i < 3; i++) {
    if (
      board[0][i] === player &&
      board[1][i] === player &&
      board[2][i] === player
    )
      return true;
  }
  // Check diagonals
  if (
    board[0][0] === player &&
    board[1][1] === player &&
    board[2][2] === player
  )
    return true;
  if (
    board[0][2] === player &&
    board[1][1] === player &&
    board[2][0] === player
  )
    return true;

  // No win was found
  return false;
}

// Function to check if the game is a draw
function checkDraw() {
  // Iterate through all cells of the board
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      // If a cell is empty, the game is not a draw
      if (board[i][j] === "") return false;
    }
  }

  // No empty cells were found, the game is a draw
  return true;
}

// Function to reset the game
function resetGame() {
  // Reset the board to all empty cells
  board = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
  // Set the current player to 'X'
  currentPlayer = "X";
  // Set the last player to ''
  lastPlayer = "";
}

// Function to print the current state of the board
function printBoard() {
  let str = "";
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === "X") {
        str += "❌";
      } else if (board[i][j] === "O") {
        str += "🅾️";
      } else {
        str += ":white_square_button:";
      }
      str += " | ";
    }
    str += "\n---------------\n";
  }
  return str;
}

function makeBotMove() {
  const channel = client.channels.cache.get(gameChannel);

  channel.send({
    embeds: [new EmbedBuilder().setDescription("Bot's move!")],
  });

  // Check if the opponent has placed their symbol in the center cell
  if (board[1][1] === "X") {
    // Place the bot's symbol in a random corner cell
    let cornerCells = [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ];
    let index;
    let row;
    let col;
    do {
      index = Math.floor(Math.random() * cornerCells.length);
      row = cornerCells[index][0];
      col = cornerCells[index][1];
    } while (
      board[row][col] !== "" ||
      board[row][col] === lastPlayer ||
      board[row][col] === currentPlayer
    );
    board[row][col] = botSymbol;
  } else {
    // Check if the opponent can win in their next move
    let moveFound = false;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i][j] === "") {
          // Make a hypothetical move for the opponent
          board[i][j] = currentPlayer;
          if (checkWin(currentPlayer)) {
            // The opponent can win, so place the bot's symbol in this cell to block the opponent
            board[i][j] = botSymbol;
            moveFound = true;
            break;
          }
          // Undo the hypothetical move
          board[i][j] = "";
        }
      }
      if (moveFound) {
        break;
      }
    }

    if (!moveFound) {
      // Place the bot's symbol in the center cell if it is empty
      if (board[1][1] === "") {
        board[1][1] = botSymbol;
      } else {
        // Select a random empty cell
        let emptyCells = [];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (board[i][j] === "") {
              emptyCells.push([i, j]);
            }
          }
        }
        let index;
        let row;
        let col;
        do {
          index = Math.floor(Math.random() * emptyCells.length);
          row = emptyCells[index][0];
          col = emptyCells[index][1];
        } while (
          board[row][col] !== "" ||
          board[row][col] === lastPlayer ||
          board[row][col] === currentPlayer
        );
        board[row][col] = botSymbol;
      }
    }
  }

  // Print the current state of the board
  channel.send(printBoard());

  // Check if the bot has won
  if (checkWin(botSymbol)) {
    channel.send({
      embeds: [
        new EmbedBuilder().setDescription(`Player ${botSymbol} has won!`),
      ],
    });
    resetGame();
  } else if (checkDraw()) {
    channel.send({
      embeds: [new EmbedBuilder().setDescription(`The game is a draw!`)],
    });
    resetGame();
  } else {
    // Switch to the other player
    lastPlayer = botSymbol;
    currentPlayer = "X";
    channel.send({
      embeds: [
        new EmbedBuilder().setDescription(
          `It is now player ${currentPlayer}'s turn.`
        ),
      ],
    });
  }
}

//---- FOR TWITTER ----
// let lastTweetId;

// const tweeterUsername = "DominoRico";

// const tweetChannelId = "991159496359542808";

// const endpointParameters = {
//   "tweet.fields": ["author_id", "conversation_id"],
//   expansions: ["author_id", "referenced_tweets.id"],
//   "media.fields": ["url"],
// };

// async function sendMessage(tweet, client) {
//   const url = "https://twitter.com/user/status/" + tweet.id;
//   try {
//     const channel = await client.channels.fetch(tweetChannelId);
//     channel.send(`New tweet from **${tweeterUsername}!**\n${url}`);
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function listenForever(streamFactory, dataConsumer) {
//   let backoffTime = 1000; // starting backoff time of 1 second
//   try {
//     for await (const { data } of streamFactory()) {
//       if (!data.text.startsWith("RT")) {
//         dataConsumer(data);
//         lastTweetId = data.id; // store the last tweet id
//         backoffTime = 1000; // reset backoff time
//       }
//     }
//     // The stream has been closed by Twitter. It is usually safe to reconnect.
//     console.log("Stream disconnected healthily. Reconnecting.");
//     listenForever(streamFactory, dataConsumer);
//   } catch (error) {
//     // An error occurred so we reconnect to the stream.
//     console.warn(
//       "Stream disconnected with error. Retrying in " + backoffTime + "ms.",
//       error
//     );
//     setTimeout(() => listenForever(streamFactory, dataConsumer), backoffTime);
//     backoffTime *= 2; // double the backoff time for next reconnection attempt
//   }
// }

// async function setup() {
//   try {
//     console.log("Setting up Twitter....");
//     let body = {
//       add: [{ value: "from:" + tweeterUsername, tag: "from Me!!" }],
//     };
//     if (lastTweetId) {
//       body.add[0].value += " since_id:" + lastTweetId;
//     }
//     const r = await T.post("tweets/search/stream/rules", body);
//     console.log(r);
//   } catch (err) {
//     console.log(err);
//   }
// }
// client.on("ready", () => {
//   setup();
//   listenForever(
//     () => T.stream("tweets/search/stream", endpointParameters),
//     (data) => sendMessage(data, client)
//   );
// });

// //---CAPTURE TWITTER FOLLOWERS, GUILD MEMBERS, AND CREATE WEBSITE CHANNEL ----
// const axios = require("axios");

// async function getFollowers(userId) {
//   const headers = {
//     Authorization: `Bearer ${bearerToken}`,
//     "User-Agent": "TestAPPdiscord",
//     "Accept-Language": "en",
//   };

//   const url = `https://api.twitter.com/2/users?ids=${userId}&user.fields=public_metrics`;

//   try {
//     const response = await axios.get(url, { headers });
//     return response.data.data[0].public_metrics.followers_count;
//   } catch (err) {
//     console.log(err);
//     return "Error Occurred";
//   }
// }

// getFollowers("1394251423030947842").then((followersCount) => {
//   console.log(followersCount);
// });

// client.on("messageCreate", async (message) => {
//   //--- CREATING A CHANNEL FOR TWITTER FOLLOWERS COUNT ----
//   if (
//     message.content === "!followersCount" &&
//     message.member.roles.cache.some((role) => role.name === "Admin")
//   ) {
//     let count;

//     try {
//       const userId = "1394251423030947842"; // Replace with the userId you want to get the followers count for
//       const followersCount = await getFollowers(userId);
//       if (followersCount >= 1000) {
//         count = followersCount / 1000;
//         count = count.toFixed(1);
//         count = count + "K";
//       } else if (followersCount < 1000) {
//         count = followersCount;
//       }

//       console.log(count);

//       const voiceCatID = "1067098594248761424";
//       const everyoneId = "949286419476660225";
//       const modRoleId = "1065982267186487346";
//       const member = "951487788543541288";
//       await message.guild.channels.create({
//         name: `Twitter: ${count}`,
//         type: ChannelType.GuildVoice,
//         parent: voiceCatID, // voice category
//         permissionOverwrites: [
//           {
//             id: everyoneId,
//             deny: [
//               PermissionsBitField.Flags.ViewChannel,
//               PermissionsBitField.Flags.CreateInstantInvite,
//             ],
//           },
//           {
//             id: member,
//             allow: [PermissionsBitField.Flags.ViewChannel],
//             deny: [
//               PermissionsBitField.Flags.CreateInstantInvite,
//               PermissionsBitField.Flags.Connect,
//               PermissionsBitField.Flags.Speak,
//             ],
//           },
//           {
//             id: modRoleId,
//             allow: [PermissionsBitField.Flags.ViewChannel],
//           },
//         ],
//       });
//     } catch (err) {
//       console.log(err);
//     }
//   }

//   //-- CREATING A CHANNEL FOR DISCORD MEMBERS COUNT ----
//   if (
//     message.content === "!membersCount" &&
//     message.member.roles.cache.some((role) => role.name === "Admin")
//   ) {
//     let count;
//     const totalMembers = message.guild.memberCount;
//     const voiceCatID = "1067098594248761424";
//     const everyoneId = "949286419476660225";
//     const modRoleId = "1065982267186487346";
//     const member = "951487788543541288";
//     try {
//       if (totalMembers >= 1000) {
//         count = totalMembers / 1000;
//         count = count.toFixed(1);
//         count = count + "K";
//       } else if (totalMembers < 1000) {
//         count = totalMembers;
//       }

//       await message.guild.channels.create({
//         name: `Total Members: ${count}`,
//         type: ChannelType.GuildVoice,
//         parent: voiceCatID, // voice category
//         permissionOverwrites: [
//           {
//             id: everyoneId,
//             deny: [
//               PermissionsBitField.Flags.ViewChannel,
//               PermissionsBitField.Flags.CreateInstantInvite,
//             ],
//           },
//           {
//             id: member,
//             allow: [PermissionsBitField.Flags.ViewChannel],
//             deny: [
//               PermissionsBitField.Flags.CreateInstantInvite,
//               PermissionsBitField.Flags.Connect,
//               PermissionsBitField.Flags.Speak,
//             ],
//           },
//           {
//             id: modRoleId,
//             allow: [PermissionsBitField.Flags.ViewChannel],
//           },
//         ],
//       });
//     } catch (err) {
//       console.log(err);
//     }
//   }

//   //--- CREATING A CHANNEL FOR WEBSITE NAME ----

//   if (message.content === "!website") {
//     const voiceCatID = "1067098594248761424";
//     const everyoneId = "949286419476660225";
//     const modRoleId = "1065982267186487346";
//     const member = "951487788543541288";
//     try {
//       await message.guild.channels.create({
//         name: `www.bloktopia.com`,
//         type: ChannelType.GuildVoice,
//         parent: voiceCatID, // voice category
//         permissionOverwrites: [
//           {
//             id: everyoneId,
//             deny: [
//               PermissionsBitField.Flags.ViewChannel,
//               PermissionsBitField.Flags.CreateInstantInvite,
//             ],
//           },
//           {
//             id: member,
//             allow: [PermissionsBitField.Flags.ViewChannel],
//             deny: [
//               PermissionsBitField.Flags.CreateInstantInvite,
//               PermissionsBitField.Flags.Connect,
//               PermissionsBitField.Flags.Speak,
//             ],
//           },
//           {
//             id: modRoleId,
//             allow: [PermissionsBitField.Flags.ViewChannel],
//           },
//         ],
//       });
//     } catch (err) {
//       console.log(err);
//     }
//   }
// });

//---- REACTION ROLES ----
// const rolesEmojis = {
//   "🇹🇷": "turkey",
//   "🇮🇩": "indonesia",
//   "🇻🇳": "vietnam",
//   "🇷🇺": "russia",
//   "🇵🇭": "philippines",
//   "🇨🇳": "china",
// };

//---------------------------------- FOR AI FEATURES ----------------------------------
// let faq = [
//   "I was created by Brandless PH team to help crypto communities get answers to commonly asked questions about a crypto project.",
//   "I'm a bot that helps you get answers to commonly asked questions about a crypto project.",
//   "I only answer questions about a crypto project.",
//   "The payment options for Brandless PH's services are currently not disclosed.",
// ];

// //--- FUNCTIONS FOR FETCHING DATA FROM MONGODB WHEN BOT RESTARTS ----
// function fetch() {
//   faqs.find({}, (error, faqs) => {
//     if (error) {
//       msg.reply({
//         embeds: [
//           new EmbedBuilder()
//             .setDescription(`**Error fetching FAQ data: ${error}.**`)
//             .setColor("#303434"),
//         ],
//       });
//     } else {
//       // Create an array of the answers
//       faq = faqs.map((faq) => faq.answer);
//       console.log(faq);
//       console.log("FAQ data loaded");
//     }
//   });
// }

// fetch();

// //--- FUNCTIONS FOR CREATING A TXT FILE
// async function main() {
//   //get the channel using the channel id
//   const channel = await client.channels.fetch(botControlChannelId);

//   faqs.find({}, (error, faqs) => {
//     if (error) {
//       console.log(error);
//     } else {
//       // Create an array of the answers
//       const faqFile = faqs.map((faq) => faq.answer);
//       const fileData = faqFile.join("\n");
//       fs.writeFile("faq.txt", fileData, (err) => {
//         if (err) {
//           console.log(`Error writing to file: ${err}`);
//         } else {
//           console.log("The faq data has been written to the file");
//           channel.send({
//             files: [
//               {
//                 attachment: "faq.txt",
//                 name: "faq.txt",
//               },
//             ],
//           });
//         }
//       });
//     }
//   });
// }

// client.on("messageReactionAdd", async (reaction, user) => {
//   if (user.bot) return;

//   //get the reaction channel
//   if (reaction.message.channelId !== AIChannelId) return;

//   if (reaction.message.partial) {
//     try {
//       await reaction.message.fetch();
//     } catch (error) {
//       console.log("Something went wrong when fetching the message: ", error);
//       return;
//     }
//   }

//   // // Check if the user already has another role based on the given object
//   // const member = await reaction.message.guild.members.fetch(user.id);
//   // const userRoles = member.roles.cache.filter((role) => {
//   //   return Object.values(rolesEmojis).includes(role.name);
//   // });

//   // const currentRole = member.roles.cache.find((r) =>
//   //   Object.values(rolesEmojis).includes(r.name)
//   // );

//   // // If the user already has another role based on the given object, ask them to remove it
//   // if (userRoles.size > 0 && currentRole) {
//   //   try {
//   //     await reaction.users.remove(user.id);
//   //   } catch (error) {
//   //     console.error(`Could not send message to ${member.user.username}`);
//   //   }
//   //   return;
//   // }

//   // const emoji = reaction.emoji.name;
//   // if (rolesEmojis[emoji]) {
//   //   const role = reaction.message.guild.roles.cache.find(
//   //     (r) => r.name === rolesEmojis[emoji]
//   //   );
//   //   reaction.message.guild.members.cache.get(user.id).roles.add(role);
//   // }

//   // add a check for reaction and reaction should be given by the Admin.
//   // Get the user who reacted
//   const guildMember = reaction.message.guild.members.cache.get(user.id);

//   // Check if the user who reacted is a member of the guild
//   if (!guildMember) return console.log("User not found");

//   if (
//     reaction.emoji.name === "✅" &&
//     guildMember.roles.cache.some((role) => role.name === "Admin")
//   ) {
//     try {
//       // check if there is a reaction ❌ on the message and remove it
//       if (reaction.message.reactions.cache.get("❌")) {
//         reaction.message.reactions.cache.get("❌").remove();
//       }

//       const replyMessage = reaction.message;
//       const answer = replyMessage.content;

//       // console.log(question);
//       console.log(answer);

//       // add the question and answer to an existing document in the database
//       const newFaq = new faqs({
//         answer: answer,
//       });

//       newFaq.save(async (error) => {
//         if (error) {
//           console.log(error);
//         } else {
//           // fetching the new data from the database
//           await fetch();

//           await replyMessage.react("💾").then(() => {
//             console.log("New FAQ added to database");
//           });
//         }
//       });
//     } catch (error) {
//       console.log("Something went wrong when fetching the message: ", error);
//       return;
//     }
//   } else {
//     console.log("Not an admin");
//   }
// });

// client.on("messageReactionRemove", async (reaction, user) => {
//   // const emoji = reaction.emoji.name;
//   // const member = reaction.message.guild.members.cache.get(user.id);

//   // if (user.bot) return;

//   // if (rolesEmojis[emoji]) {
//   //   const role = reaction.message.guild.roles.cache.find(
//   //     (r) => r.name === rolesEmojis[emoji]
//   //   );
//   //   member.roles.remove(role);
//   // }

//   if (reaction.message.channelId !== AIChannelId) return;

//   //--- getting the reacted message and reply --
//   const replyMessage = reaction.message;
//   const answer = replyMessage.content;

//   // check if the admin removed the checked reaction
//   // Get the user who reacted
//   const guildMember = reaction.message.guild.members.cache.get(user.id);

//   // Check if the user who reacted is a member of the guild
//   if (!guildMember) return console.log("User not found");

//   if (
//     reaction.emoji.name === "✅" &&
//     guildMember.roles.cache.some((role) => role.name === "Admin")
//   ) {
//     // check if there is a reaction 💾 on the message and remove it
//     if (reaction.message.reactions.cache.get("💾")) {
//       reaction.message.reactions.cache.get("💾").remove();
//     }

//     // delete the question and answer from the mongoDB database

//     try {
//       faqs.deleteOne({ answer: answer }, function (err, obj) {
//         if (err) throw err;

//         console.log("1 document deleted");
//       });

//       await wait(2000);
//       fetch();

//       await replyMessage.react("❌");
//     } catch (err) {
//       console.log(err);
//     }
//   }
// });

//--- FOR TICKET TIMESTAMPS ----

const parentIds = [
  "1069452837999869972",
  "1069452884531478588",
  "1069452957952770141",
  "1069453014882074756",
];

client.on("messageCreate", async (msg) => {
  // listen for messages from the specified category ids
  if (parentIds.includes(msg.channel.parentId)) {
    const botMessages = msg.channel.messages.cache.filter(
      (m) => m.author.id === client.user.id
    );
    if (botMessages.size > 2) return; // check for 3rd message from the bot

    //check if the channel id is in the firstResponse database using findOne
    const firstResponseChannel = await firstResponse.findOne({
      channelId: msg.channel.id,
    });

    if (firstResponseChannel) return;

    // capture the timestamp of the first message from a member with Moderator role
    if (msg.member.roles.cache.some((role) => role.name === "Moderator")) {
      // check if there is a previous message from the moderator
      const moderatorMessages = msg.channel.messages.cache.filter(
        (m) => m.author.id === msg.author.id
      );
      if (moderatorMessages.size <= 1) {
        // get the timestamp of the ticket creation
        const date = new Date();
        const timestamp = date.getTime();
        // convert the timestamp to date format
        const dateObject = new Date(timestamp);
        const humanDateFormat = dateObject.toLocaleString();

        msg
          .reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(`**First Response Time:** ${humanDateFormat}`)
                .setColor("#303434"),
            ],
          })
          .then(async () => {
            // save the channel id to the firstResponse database
            try {
              const newFirstResponse = new firstResponse({
                channelId: msg.channel.id,
              });

              await newFirstResponse.save();
            } catch (err) {
              console.log(err);
            }
          });
      }
    }
  }
});

//--- FOR UPLOADING VECTORS TO PINECONE ---

client.on("messageCreate", async (msg) => {
  if (msg.attachments.size > 0) {
    const attachment = msg.attachments.first();
    const fileName = attachment.name;
    const fileExtension = fileName.split(".").pop();
    if (fileExtension === "xlsx") {
      const filePath = `./${fileName}`;
      const file = fs.createWriteStream(filePath);

      https.get(attachment.url, function (response) {
        response.pipe(file);
        file.on("finish", async function () {
          file.close();
          console.log(`File downloaded to ${filePath}.`);
          vectorChannel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription("⬇️ Files downloaded and being parsed")
                .setColor("#303434"),
            ],
          });

          await createIndex(vectorChannel);
          await upsertVectors(filePath, vectorChannel);
        });
      });
    }
  }
});

//----- FOR AI FEATURES -------

let template = `Act as an AI chatbot that is having a conversation with a person. Strickly using only the list of contexts provided below, select carefully the information to answer the person's question or follow up message from the previous conversation as truthfully as possible. If there are any relevant available URLs or links, add them as sources in your response and ask a follow up question based on the available information in the context. Do not, at any cost, create your own information or URLs just to answer a question. If the person doesn't have any question, respond in a friendly manner.`;

//------- AI CONVO -------
client.on("messageCreate", async (msg) => {
  const modRole = msg.guild.roles.cache.find(
    (role) => role.name === "Moderator"
  );

  //--- FOR PREVENTING SPAM ---
  // Get the timestamp of the last message sent by the member
  const lastMessageTimestamp = timeouts.get(msg.author.id);

  // Check if the member has sent a message within the timeout period
  if (
    lastMessageTimestamp &&
    Date.now() - lastMessageTimestamp < 5 * 1000 &&
    msg.channel.id === AIChannelId
  ) {
    if (msg.author.bot) return;

    msg.channel
      .send({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${msg.author}, please don't spam.`)
            .setColor("#303434"),
        ],
      })
      .then(async (sentMessage) => {
        await wait(5000);
        sentMessage.delete();
      });

    // Timeout the member
    msg.member
      .timeout(60000)
      .then(() => {
        console.log(`Timeout successful for member ${msg.author.username}`);
      })
      .catch((error) => {
        console.log(
          `Error occurred while trying to timeout member ${msg.author.username}: ${error}`
        );
      });
  } else {
    // Update the timestamp for the member
    timeouts.set(msg.author.id, Date.now());
  }

  //-- FOR STORING FAQ DATA IN MONGODB VIA ATTACHMENT FILES ----
  // if (
  //   msg.attachments.size > 0 &&
  //   msg.attachments.first().name === "Notes.xlsx"
  // ) {
  //   const { PythonShell } = require("python-shell");
  //   const path = require("path");
  //   const fs = require("fs");
  //   const attachment = msg.attachments.first();
  //   const XLSX = require("xlsx");

  //   // Download the .xlsx file and read its contents
  //   https.get(attachment.url, (res) => {
  //     let chunks = [];
  //     res.on("data", (chunk) => {
  //       chunks.push(chunk);
  //     });
  //     res.on("end", async () => {
  //       const buffer = Buffer.concat(chunks);

  //       // Save the file to disk
  //       const input_datapath = path.join(__dirname, attachment.name);
  //       fs.writeFileSync(input_datapath, buffer);

  //       // Execute the Python script with the updated input file path
  //       const options = {
  //         scriptPath: path.join(__dirname, "/"), // set the directory where the script is located
  //         args: [input_datapath],
  //       };

  //       PythonShell.run("embed.py", options, function (err, results) {
  //         if (err) throw err;
  //         console.log("Python script finished:", results);
  //       });

  //       try {
  //         await msg.reply({
  //           embeds: [
  //             new EmbedBuilder()
  //               .setDescription(
  //                 `**Notes file uploaded. Please allow at least 1 minute to fully complete the process!**`
  //               )
  //               .setColor("#303434"),
  //           ],
  //         });
  //       } catch (error) {
  //         console.error(error);
  //       }
  //     });
  //   });
  // }

  //--- FOR AI CONVERSATION ---
  if (msg.channel.id === AIChannelId) {
    if (
      msg.author.bot ||
      msg.member.roles.cache.some((role) => role.name === "Moderator")
    )
      return;

    const resetButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("reset")
        .setLabel("Reset Convo")
        .setStyle(ButtonStyle.Danger)
    );

    //---- checking the conversation data from the database -----
    const conversationData = await conversation.findOne({
      userId: msg.author.id,
    });

    let promptAnswered = false;
    let conversationHistory = "";

    //---- function to create a memory ------
    function getMemory() {
      let memory = "";

      return new Promise((resolve, reject) => {
        conversation.findOne(
          { userId: msg.author.id },
          async (error, conversation) => {
            if (error) {
              console.error(error);
              reject(error);
            } else if (conversation) {
              if (!promptAnswered) {
                conversation.conversation.forEach((item) => {
                  conversationHistory += `person: ${item.person}\nai: ${item.ai}\n`;
                });
                memoryPrompt = `Act as a semantic search information generator. Using the current conversation and the current message below, determine if the person has a follow up question to the latest conversation and create a short unique key information that is no more than 5 words to be used for semantic search. If the current message is a new topic and not related to the current conversation, copy the ${msg.content} as the generated information. Let's think step by step.\nCurrent Conversation:\n${conversationHistory}\n\nCurrent message: ${msg.content}\nKey information:`;
                memory = await ask(memoryPrompt);
                promptAnswered = true;
                resolve(memory);
              }
            } else {
              console.log("No conversation history found");
              memory = msg.content;
              resolve(memory);
            }
          }
        );
      });
    }

    getMemory()
      .then(async (memory) => {
        if (memory === undefined) {
          msg.reply("An error occured. Please try again later.");
          return;
        } else {
          msg.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription(`Searching for: **${memory}** 🔍`)
                .setColor("#303434"),
            ],
          });
        }
        console.log(`Here's the current unique info:\n\n${memory}`);

        msg.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Generating answers for ${msg.author} ⚙️`)
              .setColor("#303434"),
          ],
        });

        try {
          const pineconeResult = await queryIndex(memory);

          const googleResult = await googleSearch(memory)
            .then(async (res) => {
              const res1href = res[0].href;
              const res1snippet = res[0].snippetString;
              const res2href = res[1].href;
              const res2snippet = res[1].snippetString;
              const res3href = res[2].href;
              const res3snippet = res[2].snippetString;

              const googlePrompt = `Using the context provided below, create a unique one sentence information that is related to the question. Include any relevant URLs or links to be used as a reference.\n\nQuestion: ${msg.content}\n\nContext 1:\n\n${res1href}\n\n${res1snippet}\n\nContext 2:\n\n${res2href}\n\n${res2snippet}\n\nContext 3:\n\n${res3href}\n\n${res3snippet}`;
              const googleContext = await ask(googlePrompt);

              // console.log(googleContext);

              return googleContext;
            })
            .catch((error) => console.log(error));

          // console.log(`**Pinecone Result:**\n\n${pineconeResult}`);
          // console.log(`**Google Result:**\n\n${googleResult}`);

          const prompt = `${template}. If the given contexts does not provide the truthful information or the question is not within the context of bloktopia, say, "I'm sorry, I don't know. Please try to rephrase your question to be more specific or you can ask the ${modRole} instead or create a ticket."\n\nPlease think step by step before generating a response."\n\nContext:\n${pineconeResult}11. ${googleResult}\n\nContinue the conversion:\n\n${conversationHistory}person: Hi there.\nai: Hello. How can I help you?\nperson: Thanks for the help. I'm good for now.\nai: You're welcome. Have a great day!\nperson: ${msg.content}\nai:`;

          console.log(prompt);

          const answer = await ask(prompt);
          promptAnswered = false;

          // check if the answer's content has "This is the error"
          if (answer.message2 !== undefined) {
            if (answer.message2.includes("Error encountered")) {
              // send the error message to the channel
              errorChannel
                .send({
                  embeds: [
                    new EmbedBuilder()
                      .setDescription(`${answer.message2}`)
                      .setThumbnail(
                        "https://media.tenor.com/eDchk3srtycAAAAi/piffle-error.gif"
                      )
                      .setColor("#303434"),
                  ],
                })
                .then(async () => {
                  await msg.channel.sendTyping();
                  await wait(2000);
                  msg.reply({
                    content: answer.message1,
                    components: [resetButton],
                  });
                });

              return;
            }
          }

          if (!conversationData) {
            console.log("no conversation data");
            // console.log(prompt);
            const newConversation = new conversation({
              userId: msg.author.id,
              conversation: {
                person: msg.content,
                ai: answer,
              },
              count: 1,
            });

            await newConversation.save().then(async () => {
              await msg.channel.sendTyping();
              await wait(2000);
              msg.reply({
                content: answer,
                components: [resetButton],
              });
            });
          } else {
            console.log("Conversation data found");
            // console.log(prompt);
            //add the new conversation to the db
            conversationData.count++;
            conversationData.conversation.push({
              person: msg.content,
              ai: answer,
            });

            console.log(conversationData.count);

            await conversationData.save().then(async () => {
              await msg.channel.sendTyping();
              await wait(2000);
              msg
                .reply({
                  content: answer,
                  components: [resetButton],
                })
                .then(async () => {
                  //check if the count is 10, if it is, then delete the conversation history
                  if (conversationData.count === 10) {
                    await conversationData.deleteOne();

                    await msg.reply({
                      content:
                        "Thanks for the chat. We've made 10 conversations already so I'll delete the conversation history now.",
                      components: [],
                    });
                  }
                });
            });
          }
        } catch (err) {
          console.log(err);
        }
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  }
});

//--- FOR TIC TAC TOE GAME ---
client.on("messageCreate", async (msg) => {
  // Ignore messages that do not start with the '!ttt' prefix
  if (!msg.content.startsWith("!mark")) return;

  // Split the message into arguments by spaces
  const args = msg.content.split(" ");

  // Get the row and column indices from the arguments
  const row = parseInt(args[1]);
  const col = parseInt(args[2]);

  // Check if the indices are valid and the cell is empty
  if (row >= 0 && row < 3 && col >= 0 && col < 3 && board[row][col] === "") {
    // Place the current player's symbol on the board
    board[row][col] = currentPlayer;

    // Print the current state of the board
    msg.channel.send(printBoard());

    // Check if the current player has won
    if (checkWin(currentPlayer)) {
      msg.channel.send({
        embeds: [
          new EmbedBuilder().setDescription(`Player ${currentPlayer} has won!`),
        ],
      });
      resetGame();
    } else if (checkDraw()) {
      msg.channel.send({
        embeds: [new EmbedBuilder().setDescription(`The game is a draw!`)],
      });
      resetGame();
    } else {
      lastPlayer = currentPlayer;
      currentPlayer = currentPlayer === "X" ? botSymbol : "X";

      // If it is the bot's turn, make a move
      if (currentPlayer === botSymbol) {
        makeBotMove();
      } else {
        msg.channel.send({
          embeds: [
            new EmbedBuilder().setDescription(
              `It is now player ${currentPlayer}'s turn.`
            ),
          ],
        });
      }
    }
  } else {
    msg.channel.send({
      embeds: [new EmbedBuilder().setDescription("Invalid move!")],
    });
  }
});

//---- FOR TOSS A COIN GAME -----
client.on("messageCreate", async (msg) => {
  //--- FOR TOSS A COIN GAME ----
  if (
    msg.content === "!toss" &&
    msg.author.bot &&
    msg.channel.id === gameChannel
  ) {
    const coin = Math.floor(Math.random() * 2);

    const guessButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("heads")
        .setLabel("Heads")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("tails")
        .setLabel("Tails")
        .setStyle(ButtonStyle.Success)
    );

    if (coin === 0) {
      coinSide = "heads";

      console.log(coinSide);

      msg
        .reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`TOSSING COIN...`)
              .setImage(
                "https://media.tenor.com/JlDkKFwn8AoAAAAC/toss-coin-flip.gif"
              ),
          ],
        })
        .then(async (sentMessage) => {
          await wait(2500);
          sentMessage.delete();

          await msg.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`What's your guess?`)
                .setThumbnail(
                  "https://media.tenor.com/Ji8vLfj669IAAAAi/thinking-goma.gif"
                ),
            ],
            components: [guessButton],
          });
        });

      return;
    } else {
      coinSide = "tails";

      console.log(coinSide);

      msg
        .reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`TOSSING COIN...`)
              .setImage(
                "https://media.tenor.com/JlDkKFwn8AoAAAAC/toss-coin-flip.gif"
              ),
          ],
        })
        .then(async (sentMessage) => {
          await wait(2500);
          sentMessage.delete();

          await msg.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`What's your guess?`)
                .setThumbnail(
                  "https://media.tenor.com/Ji8vLfj669IAAAAi/thinking-goma.gif"
                ),
            ],
            components: [guessButton],
          });
        });

      return;
    }
  }
});

//---- FOR LEVEL AND XP ---
client.on("messageCreate", async (msg) => {
  // ignore messages from bots
  if (msg.author.bot) return;

  //-- FOR LEVELING UP AND EARNING XP POINTS --
  // Next, we need to find the user's xp and level in the database
  userLevel.findOne({ userID: msg.author.id }, (err, user) => {
    if (err) {
      console.error(err);
      return;
    }

    // If the user is not in the database, create a new entry for them
    if (!user) {
      const newUser = new userLevel({
        userID: msg.author.id,
        xp: 10,
        level: 0,
        lastMessage: Date.now(),
      });

      newUser.save((err, user) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`Created new user entry for ${msg.author.username}`);
      });
    } else {
      // If the user is in the database, update their xp and level
      // Check if the user has already earned xp in the past minute
      if (!user.lastMessage || Date.now() - user.lastMessage > 60000) {
        user.xp += 10;
        user.lastMessage = Date.now();
        const xpNeeded = user.level * 155 + 100; // xp needed to level up
        if (user.xp >= xpNeeded) {
          user.level += 1;
          user.xp = 0;
        }
        user.save((err, user) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log(`Updated xp and level for ${msg.author.username}`);
        });
      }
    }
  });

  //-- FOR ADMIN DELETING THE DATA ----
  if (msg.content === "!deleteData") {
    if (msg.member.roles.cache.some((role) => role.name === "Admin")) {
      // Delete all the data in the database
      userLevel.deleteMany({}, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        msg.reply("All data deleted from the database.");
      });
      return;
    } else {
      msg.reply(`You're not allowed to delete the data`);
    }
  }

  //-- FOR SETTING UP THE LEVEL AND XP CHECKING CHANNEL --
  // check if member sent "!level" or "!xp"
  if (msg.content === "!level" && msg.channel.id === channelForCheckingLevel) {
    // Find the user's level in the database
    userLevel.findOne({ userID: msg.author.id }, (err, user) => {
      if (err) {
        console.error(err);
        return;
      }
      if (user) {
        msg.reply({
          embeds: [
            new EmbedBuilder().setDescription(
              `Your level is **${user.level}** 🎉`
            ),
          ],
        });
      } else {
        msg.reply({
          embeds: [
            new EmbedBuilder().setDescription(
              `You have not earned any xp yet.`
            ),
          ],
        });
      }
    });
    return;
  } else if (
    msg.content === "!xp" &&
    msg.channel.id === channelForCheckingLevel
  ) {
    // Find the user's xp in the database
    userLevel.findOne({ userID: msg.author.id }, (err, user) => {
      if (err) {
        console.error(err);
        return;
      }
      if (user) {
        msg.reply({
          embeds: [
            new EmbedBuilder().setDescription(
              `Your current XP is **${user.xp}** ⭐️`
            ),
          ],
        });
      } else {
        msg.reply({
          embeds: [
            new EmbedBuilder().setDescription(
              `You have not earned any XP yet.`
            ),
          ],
        });
      }
    });
    return;
  }
});

//-- FOR REMOVING UNWANTED EMOJIS FOR COMMUNITY ROLES --
// client.on("ready", async () => {
//   try {
//     let message = await client.channels.cache
//       .get(channelId)
//       .messages.fetch("1068119516409761853");
//     // await message.react("🇵🇭");
//     // await message.react("🇨🇳");
//     await message.reactions.cache.get("🇵🇭").remove();
//     await message.reactions.cache.get("🇨🇳").remove();
//     console.log("Reaction updated");
//   } catch (error) {
//     console.error(`Error adding reaction to message: ${error}`);
//   }
// });

//------------ HANDLING MSG EVENTS ----------------
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  stickySchema.findOne({ ChannelID: message.channel.id }, async (err, data) => {
    if (err) throw err;

    if (!data) return;

    let channel = data.ChannelID;
    let cachedChannel = client.channels.cache.get(channel);

    const embed = new EmbedBuilder()
      .setDescription(data.Message)
      .setFooter({ text: `This is a sticky message.` });

    if (message.channel.id === channel) {
      data.CurrentCount += 1;
      data.save();

      if (data.CurrentCount > data.MaxCount) {
        try {
          await client.channels.cache
            .get(channel)
            .messages.fetch(data.LastMessageID)
            .then(async (msg) => {
              await msg.delete();
            });

          let newMessage = await cachedChannel.send({ embeds: [embed] });

          data.LastMessageID = newMessage.id;
          data.CurrentCount = 0;
          data.save();
        } catch (error) {
          console.error(error);
        }
      }
    }
  });
});
//------------ HANDLING EVENTS ----------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === "createFile") {
      main();

      interaction.update({
        embeds: [
          new EmbedBuilder()
            .setDescription(`**FAQs were created successfully!**`)
            .setColor("#303434"),
        ],
        components: [],
      });

      return;
    }

    //--FOR RESETTING AI CONVERSATION ---
    if (interaction.customId === "reset") {
      try {
        await interaction.deferReply();
        await conversation.deleteOne({ userId: interaction.user.id });
        await interaction.editReply({
          content: `${interaction.user}, Our conversation has been reset.`,
        });

        return;
      } catch (error) {
        console.error(error);
      }
    }

    // --- FOR GAMES INFO ---

    if (interaction.customId === "tossCoin") {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Please watch the sample gameplay:`)
            .setImage(
              "https://media3.giphy.com/media/WkJKKAY3RL4r4SrjEG/giphy.gif?cid=790b7611bead988e2efa735c6946f209113a3087a349f82d&rid=giphy.gif&ct=g"
            ),
        ],
        ephemeral: true,
      });
    } else if (interaction.customId === "ttt") {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Please watch the sample gameplay:`)
            .setImage(
              "https://media4.giphy.com/media/0XgsnLqgrtpTJtZfmD/giphy.gif?cid=790b7611d4c551f66f4bfcc4672c49778936b85010f7b0be&rid=giphy.gif&ct=g"
            ),
        ],
        ephemeral: true,
      });
    }

    // --- FOR TOSS COIN GAME ---
    const tossButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("toss")
        .setLabel("Toss A Coin")
        .setEmoji("🪙")
        .setStyle(ButtonStyle.Primary)
    );

    if (interaction.customId === "toss") {
      await interaction.reply({
        content: "!toss",
        ephemeral: false,
      });
    }

    if (interaction.customId === "heads") {
      if (!coinSide) {
        await interaction.reply({
          embeds: [new EmbedBuilder().setDescription("Please use `/toss`")],
        });
      } else {
        if (coinSide === "heads") {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`You've guessed it right!`)
                .setImage(
                  "https://gifdb.com/images/file/happy-cat-goma-excited-clapping-thumbs-up-bi9gbnqp2uvxrtu6.gif"
                ),
            ],
            components: [tossButton],
          });

          coinSide = "";
        } else {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Nope! Better luck next time.`)
                .setImage(
                  "https://media.tenor.com/iPf6IpTl66kAAAAi/cutie-cat.gif"
                ),
            ],
            components: [tossButton],
          });

          coinSide = "";
        }
      }
    } else if (interaction.customId === "tails") {
      if (!coinSide) {
        await interaction.reply({
          embeds: [new EmbedBuilder().setDescription("Please use `/toss`")],
        });
      } else {
        if (coinSide === "tails") {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`You've guessed it right!`)
                .setImage(
                  "https://gifdb.com/images/file/happy-cat-goma-excited-clapping-thumbs-up-bi9gbnqp2uvxrtu6.gif"
                ),
            ],
            components: [tossButton],
          });

          coinSide = "";
        } else {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Nope! Better luck next time.`)
                .setImage(
                  "https://media.tenor.com/iPf6IpTl66kAAAAi/cutie-cat.gif"
                ),
            ],
            components: [tossButton],
          });

          coinSide = "";
        }
      }
    }
  }
});

client.on("guildMemberAdd", async (member) => {
  // Pass the entire Canvas object because you'll need access to its width and context
  const applyText = (canvas, text) => {
    const context = canvas.getContext("2d");

    // Declare a base size of the font
    let fontSize = 70;

    do {
      // Assign the font to the context and decrement it so it can be measured again
      context.font = `${(fontSize -= 10)}px sans-serif`;
      // Compare pixel width of the text to the canvas minus the approximate avatar size
    } while (context.measureText(text).width > canvas.width - 300);

    // Return the result to use in the actual canvas
    return context.font;
  };

  if (member.user.bot) return;

  setTimeout(async () => {
    // Get the member's unique invite link

    if (!member.roles.cache.find((role) => role.name === "member")) {
      clearTimeout();
      member.kick();
    } else {
      clearTimeout();
      member.guild.channels.cache
        .find((channel) => channel.id === "1064744958487183410")
        .createInvite({ maxAge: 0 })
        .then(async () => {
          const canvas = Canvas.createCanvas(700, 250);
          const context = canvas.getContext("2d");
          const background = await Canvas.loadImage("./wallpaper.jpeg");
          // This uses the canvas dimensions to stretch the image onto the entire canvas
          context.drawImage(background, 0, 0, canvas.width, canvas.height);
          // Set the color of the stroke
          context.strokeStyle = "#252525";
          // Draw a rectangle with the dimensions of the entire canvas
          context.strokeRect(0, 0, canvas.width, canvas.height);

          // Slightly smaller text placed above the member's display name
          context.font = "28px sans-serif";
          context.fillStyle = "#ffffff";
          context.fillText("Welcome,", canvas.width / 2.5, canvas.height / 3.5);

          // Assign the decided font to the canvas
          context.font = applyText(canvas, member.user.username);
          context.fillStyle = "#ffffff";
          context.fillText(
            member.user.username,
            canvas.width / 2.5,
            canvas.height / 1.8
          );

          // Pick up the pen
          context.beginPath();
          // Start the arc to form a circle
          context.arc(125, 125, 100, 0, Math.PI * 2, true);
          // Fill the circular path with white color
          context.fillStyle = "#fff";
          context.fill();
          // Draw a white stroke around the circular path
          context.lineWidth = 10;
          context.strokeStyle = "#fff";
          context.stroke();
          // Put the pen down
          context.closePath();
          // Clip off the region you drew on
          context.clip();

          // Using undici to make HTTP requests for better performance
          const { body } = await request(
            member.user.displayAvatarURL({ extension: "jpg" })
          );

          const avatar = await Canvas.loadImage(await body.arrayBuffer());

          // Add this code to create the white circular frame
          context.strokeStyle = "white";
          context.lineWidth = 5; // set the width of the frame
          context.stroke(); // draw the frame

          context.drawImage(avatar, 25, 25, 200, 200);
          // Use the helpful Attachment class structure to process the file for you
          const attachment = new AttachmentBuilder(await canvas.encode("png"), {
            name: "profile-image.png",
          });

          // Send a welcome message to the new member
          member.guild.channels.cache
            .find((channel) => channel.id === "1064744958487183410")
            .send({
              content: `${member.user} joined the server!`,
              files: [attachment],
            });
        });
    }
  }, 300000);
});

// client.login(token);
// (async () => {
//   await connect(uri).catch(console.error);
// })();

client.login(process.env.token);
(async () => {
  await connect(process.env.uri).catch(console.error);
})();
