const fs = require("node:fs");
const path = require("node:path");
const { connect } = require("mongoose");
const Canvas = require("@napi-rs/canvas");
const { request } = require("undici");
const userLevel = require("./levelSchema/userLevel");
const conversation = require("./conversationSchema/conversation");
const stickySchema = require("./stickySchema/sticky");
const faqs = require("./faqSchema/faqs");
const https = require("https");
//const InviteData = require("./inviteSchema/invite");
const { ask } = require("./openAI.js");
const cosineSimilarity = require("cosine-similarity");
const natural = require("natural");
const wait = require("node:timers/promises").setTimeout;
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

let coinSide;
const gameChannel = "1057293089183629342";

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
const rolesEmojis = {
  "🇹🇷": "turkey",
  "🇮🇩": "indonesia",
  "🇻🇳": "vietnam",
  "🇷🇺": "russia",
  "🇵🇭": "philippines",
  "🇨🇳": "china",
};

client.on("messageReactionAdd", async (reaction, user) => {
  const member = await reaction.message.guild.members.fetch(user.id);

  if (member.user.bot) return;

  // Check if the user already has another role based on the given object
  const userRoles = member.roles.cache.filter((role) => {
    return Object.values(rolesEmojis).includes(role.name);
  });

  const currentRole = member.roles.cache.find((r) =>
    Object.values(rolesEmojis).includes(r.name)
  );

  // If the user already has another role based on the given object, ask them to remove it
  if (userRoles.size > 0 && currentRole) {
    try {
      await reaction.users.remove(user.id);
    } catch (error) {
      console.error(`Could not send message to ${member.user.username}`);
    }
    return;
  }

  const emoji = reaction.emoji.name;
  if (rolesEmojis[emoji]) {
    const role = reaction.message.guild.roles.cache.find(
      (r) => r.name === rolesEmojis[emoji]
    );
    reaction.message.guild.members.cache.get(user.id).roles.add(role);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  const emoji = reaction.emoji.name;
  const member = reaction.message.guild.members.cache.get(user.id);

  if (user.bot) return;

  if (rolesEmojis[emoji]) {
    const role = reaction.message.guild.roles.cache.find(
      (r) => r.name === rolesEmojis[emoji]
    );
    member.roles.remove(role);
  }

  //--- getting the reacted message and reply --
  const replyMessage = reaction.message;
  const questionMessage = await replyMessage.channel.messages.fetch(
    replyMessage.reference.messageId
  );
  const question = questionMessage.content;
  const answer = replyMessage.content;

  // check if the admin removed the checked reaction
  // Get the user who reacted
  const guildMember = reaction.message.guild.members.cache.get(user.id);

  // Check if the user who reacted is a member of the guild
  if (!guildMember) return console.log("User not found");

  if (
    reaction.emoji.name === "✅" &&
    guildMember.roles.cache.some((role) => role.name === "Admin")
  ) {
    // check if there is a reaction 💾 on the message and remove it
    if (reaction.message.reactions.cache.get("💾")) {
      reaction.message.reactions.cache.get("💾").remove();
    }

    // delete the question and answer from the mongoDB database

    try {
      faqs.deleteOne(
        { question: question, answer: answer },
        function (err, obj) {
          if (err) throw err;
          console.log("1 document deleted");
        }
      );

      await replyMessage.react("❌");
    } catch (err) {
      console.log(err);
    }
  }
});

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
  const channelForCheckingLevel = "1060421595702767616";

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

// Pre-process the pre-defined FAQ data into numerical representations
// let data = fs.readFileSync("./faqs.txt", "utf8");
// let faqData = JSON.parse(data); //---- INITIALLY IMPORTING THE PROJECTLIST JS FILE -----
// let faq = faqData.slice();

//---- FOR AI DATABASE ----
let faq = [
  {
    question: "Who created you?",
    answer:
      "I was created by Brandless PH team to help crypto communities get answers to commonly asked questions about a crypto project.",
  },
];
const faqVectors = [];

function fetch() {
  faqs
    .find({})
    .then((result) => {
      if (result.length > 0) {
        // faq = result.map((item) => ({
        //   question: item.question.toString(),
        //   answer: item.answer.toString(),
        // }));

        faq = result;

        console.log("FAQ data loaded");
      } else {
        console.log("No FAQ data found");

        return;
      }
    })
    .then(() => {
      for (let i = 0; i < faq.length; i++) {
        faqVectors.push(somePreprocessingFunction(faq[i].question));
      }
    });
}

fetch();

async function getFaq() {
  const faqResult = await faqs.find({});
  return faqResult;
}

async function main() {
  //get the channel using the channel id
  const channel = await client.channels.fetch("1054312191689510983");

  const faq = await getFaq();
  if (faq.length > 0) {
    let faqData = [];
    faq.forEach((element) => {
      let faqObject = {
        question: element.question,
        answer: element.answer,
      };
      faqData.push(faqObject);
    });
    let faqString = JSON.stringify(faqData, null, 2);
    fs.writeFile("faq.txt", faqString, (err) => {
      if (err) throw err;
      console.log("The faq data has been written to the file");
      channel.send({
        files: [
          {
            attachment: "faq.txt",
            name: "faq.txt",
          },
        ],
      });
    });
  }
}

function somePreprocessingFunction(text) {
  // Tokenize the text into an array of words
  const tokens = natural.PorterStemmer.tokenizeAndStem(text);

  // Convert the array of tokens into a numerical representation, such as a bag-of-words vector
  // This step may also involve removing stop words, stemming, or vector normalization
  const vector = someConversionFunction(tokens);

  return vector;
}

function someConversionFunction(tokens) {
  // Your implementation here, for example:
  // Convert the array of tokens into a bag-of-words vector using a library such as natural
  const vector = {};
  for (const token of tokens) {
    vector[token] = (vector[token] || 0) + 1;
  }
  return vector;
}

//--- FOR ADDING NEW Q AND A TO THE DATABASE ----

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
      return;
    }
  }

  // add a check for reaction and reaction should be given by the Admin.
  // Get the user who reacted
  const guildMember = reaction.message.guild.members.cache.get(user.id);

  // Check if the user who reacted is a member of the guild
  if (!guildMember) return console.log("User not found");

  if (
    reaction.emoji.name === "✅" &&
    guildMember.roles.cache.some((role) => role.name === "Admin")
  ) {
    try {
      // check if there is a reaction ❌ on the message and remove it
      if (reaction.message.reactions.cache.get("❌")) {
        reaction.message.reactions.cache.get("❌").remove();
      }

      const replyMessage = reaction.message;
      const questionMessage = await replyMessage.channel.messages.fetch(
        replyMessage.reference.messageId
      );
      const question = questionMessage.content;
      const answer = replyMessage.content;

      // add the question and answer to an existing document in the database
      const newFaq = new faqs({
        question: question,
        answer: answer,
      });

      newFaq.save((error) => {
        if (error) {
          console.log(error);
        } else {
          console.log("New FAQ added to database");
        }
      });

      await replyMessage.react("💾");
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
      return;
    }
  } else {
    console.log("Not an admin");
  }
});
//-------POSTING AND AI
client.on("messageCreate", async (msg) => {
  //-- FOR STORING FAQ DATA IN MONGODB VIA ATTACHMENT FILES ----
  if (
    msg.attachments.size > 0 &&
    msg.attachments.first().name === "faqs.txt" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    const attachment = msg.attachments.first();

    // Download the .txt file and read its contents
    let data = "";
    https.get(attachment.url, (res) => {
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        // Parse the data as JSON
        const faqData = JSON.parse(data);

        faqs.insertMany(faqData, (error) => {
          if (error) {
            msg.reply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(`**Error creating FAQ data: ${error}.**`)
                  .setColor("#303434"),
              ],
            });
          } else {
            msg.reply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(`**FAQ data created in DB successfully!**`)
                  .setColor("#303434"),
              ],
            });
          }
        });
      });
    });
  }

  if (
    msg.content === "!fetch" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    faqs
      .find({})
      .then(async (result) => {
        if (result.length > 0) {
          faq = result;

          msg.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(`**FAQ data fetched!**`)
                .setColor("#303434"),
            ],
          });
        } else {
          msg.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(`**No data available!**`)
                .setColor("#303434"),
            ],
          });

          return;
        }
      })
      .then(() => {
        for (let i = 0; i < faq.length; i++) {
          faqVectors.push(somePreprocessingFunction(faq[i].question));
        }
      });
  }

  if (
    msg.content === "!deletefaq" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    faqs.deleteMany({}, (error) => {
      if (error) {
        msg.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`**Error deleting FAQ: ${error}.**`)
              .setColor("#303434"),
          ],
        });
      } else {
        msg.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`**FAQs were deleted successfully from DB!**`)
              .setColor("#303434"),
          ],
        });
      }
    });
  }

  if (
    msg.content === "!createfile" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    main();

    return;
  }

  //--- FOR AI CONVERSATION ---
  const AIChannel = "1057559988840701952";

  const resetButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reset")
      .setLabel("Reset Convo")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Primary)
  );

  //find a role with the name "Community Moderator"
  const modRole = msg.guild.roles.cache.find(
    (role) => role.name === "moderator"
  );

  if (
    msg.channel.id === AIChannel &&
    !msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    if (msg.author.bot) return;

    // Save the conversation history to the conversationhistory variable
    let conversationHistory = "";

    // Get the conversation history for the user
    conversation.findOne({ userId: msg.author.id }, (error, conversation) => {
      if (error) {
        console.error(error);
      } else if (conversation) {
        // Convert the conversation data to a string
        conversation.conversation.forEach((item) => {
          conversationHistory += `customer: ${item.question}\nai: ${item.answer}\n`;
        });
      } else {
        console.log("No conversation history found");
      }
    });

    //generate a code to find the user id from the mongo db and get the data from the db
    const conversationData = await conversation.findOne({
      userId: msg.author.id,
    });

    // Pre-process the input question
    const question = msg.content;
    const questionVector = somePreprocessingFunction(question);

    // Calculate cosine similarity between the input question and the pre-defined FAQ
    const similarities = [];
    for (let i = 0; i < faqVectors.length; i++) {
      similarities.push(cosineSimilarity(questionVector, faqVectors[i]));
    }

    // Make sure that there's at least one FAQ with a non-zero cosine similarity score
    const maxSimilarity = Math.max(...similarities);

    const questionWords =
      /\b(how|what|why|when|where|which|whom|whose|is|are|do|did|does|can|could|should|would|have|has|had|was|were|am|if|whether|will|shall)\b/i;

    if (!questionWords.test(msg.content)) {
      try {
        // Select the FAQ with the highest cosine similarity score as the most relevant answer
        const index = similarities.indexOf(Math.max(...similarities));

        const prompt = `You are talking to a person who is asking you questions about your product and you are answering them with the most relevant answer from the FAQ which is ${faq[index].answer}
      
      ${conversationHistory}

      customer: Thank you for your help!
      steve: Is there anything else I can help you with?

      customer: No not for now.
      steve: Thank you for your time! Have a nice day!
  
      customer: ${msg.content}
      steve: `;

        const answer = await ask(prompt); //prompt GPT-3

        if (!conversationData) {
          const newConversation = new conversation({
            userId: msg.author.id,
            conversation: {
              customer: question,
              ai: answer,
            },
          });

          await newConversation.save().then(async () => {
            await msg.channel.sendTyping();
            await wait(2000);
            await msg.reply({
              content: answer,
              components: [resetButton],
            });
          });
        } else {
          //add the new conversation to the db
          conversationData.conversation.push({
            customer: question,
            ai: answer,
          });

          await conversationData.save().then(async () => {
            await msg.channel.sendTyping();
            await wait(2000);
            await msg.reply({
              content: answer,
              components: [resetButton],
            });
          });
        }
      } catch (error) {
        console.error(error);
        return;
      }
    } else {
      if (maxSimilarity === 0) {
        try {
          //add the new conversation to the db
          if (!conversationData) {
            const newConversation = new conversation({
              userId: msg.author.id,
              conversation: {
                customer: msg.content,
                ai: `Sorry, I can only help you with FAQs related to our services. Please ask ${modRole} instead.`,
              },
            });

            await newConversation.save().then(async () => {
              await msg.channel.sendTyping();
              await wait(2000);
              await msg.reply({
                content: `Sorry, I can only help you with FAQs related to our services. Please ask ${modRole} instead.`,
                components: [resetButton],
              });
            });
          } else {
            conversationData.conversation.push({
              customer: question,
              ai: `Sorry, I can only help you with FAQs related to our services. Please ask ${modRole} instead.`,
            });

            await conversationData.save().then(async () => {
              await msg.channel.sendTyping();
              await wait(2000);
              await msg.reply({
                content: `Sorry, I can only help you with FAQs related to our services. Please ask ${modRole} instead.`,
                components: [resetButton],
              });
            });
          }
          return;
        } catch (err) {
          console.error(err);
        }
      } else {
        try {
          // Select the FAQ with the highest cosine similarity score as the most relevant answer
          const index = similarities.indexOf(Math.max(...similarities));

          const prompt = `Act as an AI chatbot named Steve that is positive, friendly and helpful. You are talking to a person who is asking you questions about your product and you are answering them with the most relevant answer from the FAQ which is ${faq[index].answer}
      
      ${conversationHistory}
  
      customer: ${msg.content}
      steve: `;

          const answer = await ask(prompt); //prompt GPT-3

          if (!conversationData) {
            const newConversation = new conversation({
              userId: msg.author.id,
              conversation: {
                customer: question,
                ai: answer,
              },
            });

            await newConversation.save().then(async () => {
              await msg.channel.sendTyping();
              await wait(2000);
              await msg.reply({
                content: answer,
                components: [resetButton],
              });
            });
          } else {
            //add the new conversation to the db
            conversationData.conversation.push({
              customer: question,
              ai: answer,
            });

            await conversationData.save().then(async () => {
              await msg.channel.sendTyping();
              await wait(2000);
              await msg.reply({
                content: answer,
                components: [resetButton],
              });
            });
          }
        } catch (error) {
          console.error(error);
          return;
        }
      }
    }
  }

  //--- FOR UPDATING MEMBERS COUNT AS A CHANNEL NAME ----
  if (
    msg.content === "!updateCount" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    console.log(msg.channel.id);

    // Get the text channel by ID
    const channel = msg.guild.channels.cache.get(msg.channel.id);

    // Get the member count of the channel
    const memberCount = channel.members.size;

    // Update the channel name with the member count
    channel.setName(`total members: ${memberCount}`);
  }

  //---- FOR REACTION ROLES -----
  if (msg.content === "!region") {
    const embed = new EmbedBuilder()
      .setTitle("**__Regional Community__**")
      .setDescription(
        "Please react your country's flag to access regional channel."
      )
      .addFields({
        name: "Note:",
        value:
          "To access a different regional channel, remove first your current reaction then react to your desired flag emoji.",
      })
      .setThumbnail("https://media.tenor.com/zlN3e54Y-uwAAAAi/victim1-map.gif")
      .setColor("#000000");

    const guild = client.guilds.cache.get(guildId);
    const channel = guild.channels.cache.get(channelId);

    channel
      .send({
        embeds: [embed],
      })
      .then(async (message) => {
        for (const emoji in rolesEmojis) {
          await message.react(emoji);
        }
      });
  }

  //--- FOR WELCOME CHANNEL POST ---
  if (
    msg.content === "!welcome" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    const welcomeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Website")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Link)
        .setURL("https://www.bloktopia.com/"),
      new ButtonBuilder()
        .setLabel("JOBE")
        .setStyle(ButtonStyle.Link)
        .setURL("https://www.bloktopia.com/jobe/"),
      new ButtonBuilder()
        .setLabel("Staking")
        .setStyle(ButtonStyle.Link)
        .setURL("https://www.bloktopia.com/staking-live/"),
      new ButtonBuilder()
        .setLabel("NFT's")
        .setStyle(ButtonStyle.Link)
        .setURL("https://landsale.bloktopia.com/")
    );

    const socialRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Twitter")
        .setStyle(ButtonStyle.Link)
        .setURL("https://twitter.com/bloktopia"),
      new ButtonBuilder()
        .setLabel("Telegram")
        .setStyle(ButtonStyle.Link)
        .setURL("https://t.me/BloktopiaChat"),
      new ButtonBuilder()
        .setLabel("YouTube")
        .setStyle(ButtonStyle.Link)
        .setURL("http://youtube.com/c/Bloktopia"),
      new ButtonBuilder()
        .setLabel("Instagram")
        .setStyle(ButtonStyle.Link)
        .setURL("https://www.instagram.com/bloktopiaofficial/")
    );

    const additionalRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Server Rules")
        .setEmoji("📖")
        .setStyle(ButtonStyle.Link)
        .setURL(
          "https://discord.com/channels/949286419476660225/949304202977497158"
        ),
      new ButtonBuilder()
        .setLabel("Select Region")
        .setEmoji("🌍")
        .setStyle(ButtonStyle.Link)
        .setURL(
          "https://discord.com/channels/949286419476660225/1065710355076104283"
        ),
      new ButtonBuilder()
        .setLabel("Report Scams")
        .setEmoji("🚨")
        .setStyle(ButtonStyle.Link)
        .setURL(
          "https://discord.com/channels/949286419476660225/954449292410650624"
        )
    );

    msg.channel.send(
      "https://cdn.discordapp.com/attachments/1059713593534324746/1068753476554866820/teaDAO.gif"
    );

    msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("Welcome to the Bloktopia Discord Server")
          .setDescription(
            "To know what is Bloktopia and get familiarize with the server, check the buttons below."
          )
          .setColor("#642c5c"),
      ],
      components: [welcomeRow],
    });

    msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription("Follow us on our social accounts.")
          .setColor("#642c5c"),
      ],
      components: [socialRow],
    });

    msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            "Go ahead and feel free to hang around or ask questions."
          )
          .setColor("#642c5c")
          .addFields(
            { name: "\u200B", value: "**Buttons information:**" },
            {
              name: "• `📖 Server Rules`",
              value: "Displays the server rules.",
            },
            {
              name: "• `🌍 Select Region`",
              value: "Channel to select and access regional channels.",
            },
            {
              name: "• `🚨 Report Scams`",
              value: "Channel to report scams.",
            }
          ),
      ],
      components: [additionalRow],
    });
  }

  //--- FOR VERIFICATION CHANNEL POST---

  if (
    msg.content === "!verify" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify")
        .setLabel("Verify")
        .setStyle(ButtonStyle.Primary)
    );

    msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("Accept The Server Rules Before Verifying")
          .setDescription("Click the ` Complete ` button to begin.")
          .setImage(
            "https://media.discordapp.net/attachments/1011586512367911032/1066941479475478559/image.png"
          )
          .setColor("#383434"),
      ],
    });

    msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            "**If you don't pass the verification within 5 minutes, you'll be kicked off the server.**"
          )
          .setThumbnail(
            "https://media.discordapp.net/attachments/1011586512367911032/1052634084637147176/1046329820331646986_1.png"
          )
          .setColor("#383434"),
      ],
    });

    msg.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("__Verification Required!__")
          .setDescription(
            "To access `Brandless PH` server, you need to pass the verification first.\n\nPress on the `verify` button below."
          )
          .setColor("#383434"),
      ],
      components: [row],
    });
  }
});

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
    //--FOR RESETTING AI CONVERSATION ---
    if (interaction.customId === "reset") {
      try {
        await conversation.deleteOne({ userId: interaction.user.id });
        await interaction.reply({
          content: `${interaction.user}, Our conversation has been reset.`,
        });

        return;
      } catch (error) {
        console.error(error);
      }
    }

    // --- FOR GAMES INFO ---

    if (interaction.customId === "tossCoin") {
      interaction.reply({
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
      interaction.reply({
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
        interaction.reply({
          embeds: [new EmbedBuilder().setDescription("Please use `/toss`")],
        });
      } else {
        if (coinSide === "heads") {
          interaction.reply({
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
          interaction.reply({
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
        interaction.reply({
          embeds: [new EmbedBuilder().setDescription("Please use `/toss`")],
        });
      } else {
        if (coinSide === "tails") {
          interaction.reply({
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
          interaction.reply({
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

      member.roles.remove(unverifiedRole);

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
