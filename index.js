const fs = require("node:fs");
const path = require("node:path");
const { connect } = require("mongoose");
const Canvas = require("@napi-rs/canvas");
const { request } = require("undici");
const userLevel = require("./levelSchema/userLevel");
//const Reaction = require("./reactionSchema/reaction");
//const InviteData = require("./inviteSchema/invite");
//const { ask } = require("./openAI.js");
const wait = require("node:timers/promises").setTimeout;
// const {
//   token,
//   uri,
//   consumerKey,
//   consumerSecret,
//   //bearerToken,
//   accessToken,
//   accessTokenSecret,
//   tweeterId,
//   tweeterUsername,
// } = require("./config.json");

const Twit = require("twitter-v2");

//const T = new Twit({
//consumer_key: consumerKey,
//consumer_secret: consumerSecret,
//bearer_token: bearerToken,
//access_token_key: accessToken,
//access_token_secret: accessTokenSecret,
//});

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
const channelId = "1056804025674235945";

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
const AIChannel = "1057559988840701952";

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
// async function sendMessage(tweet, client) {
//   const url = "https://twitter.com/user/status/" + tweet.id;
//   try {
//     const channel = await client.channels.fetch("1065158151491567626");
//     channel.send(`${url}`);
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function listenForever(streamFactory, dataConsumer) {
//   try {
//     for await (const { data } of streamFactory()) {
//       dataConsumer(data);
//     }
//     // The stream has been closed by Twitter. It is usually safe to reconnect.
//     console.log("Stream disconnected healthily. Reconnecting.");
//     listenForever(streamFactory, dataConsumer);
//   } catch (error) {
//     // An error occurred so we reconnect to the stream. Note that we should
//     // probably have retry logic here to prevent reconnection after a number of
//     // closely timed failures (may indicate a problem that is not downstream).
//     console.warn("Stream disconnected with error. Retrying.", error);
//     listenForever(streamFactory, dataConsumer);
//   }
// }

// async function setup() {
//   const endpointParameters = {
//     "tweet.fields": ["author_id", "conversation_id"],
//     expansions: ["author_id", "referenced_tweets.id"],
//     "media.fields": ["url"],
//   };
//   try {
//     console.log("Setting up Twitter....");
//     const body = {
//       add: [{ value: "from:" + tweeterUsername, tag: "from Me!!" }],
//     };
//     const r = await T.post("tweets/search/stream/rules", body);
//     console.log(r);
//   } catch (err) {
//     console.log(err);
//   }

//   listenForever(
//     () => T.stream("tweets/search/stream", endpointParameters),
//     (data) => sendMessage(data, client)
//   );
// }

// client.on("ready", () => {
//   setup();
// });

const rolesEmojis = {
  "🇹🇷": "turkey",
  "🇮🇩": "indonesia",
  "🇻🇳": "vietnam",
  "🇷🇺": "russia",
  "🇵🇭": "philippines",
  "🇨🇳": "china",
};

let msgId;

client.on("messageReactionAdd", async (reaction, user) => {
  const member = await reaction.message.guild.members.fetch(user.id);

  // Check if the user already has another role based on the given object
  const userRoles = member.roles.cache.filter((role) => {
    return Object.values(rolesEmojis).includes(role.name);
  });

  const currentRole = member.roles.cache.find((r) =>
    Object.values(rolesEmojis).includes(r.name)
  );

  const msg = await reaction.message.fetch();

  msgId = msg.id;

  if (member.user.bot) return;

  // If the user already has another role based on the given object, ask them to remove it
  if (userRoles.size > 0 && currentRole) {
    try {
      await reaction.users.remove(user.id);
    } catch (error) {
      console.error(`Could not removed the role`);
    }
    return;
  } else if (msg.id === msgId) {
    const emoji = reaction.emoji.name;
    if (rolesEmojis[emoji]) {
      const role = await reaction.message.guild.roles.cache.find(
        (r) => r.name === rolesEmojis[emoji]
      );
      await reaction.message.guild.members.cache.get(user.id).roles.add(role);
      console.log("Role assigned.");
    }
  }
});

client.on("messageReactionRemove", (reaction, user) => {
  const emoji = reaction.emoji.name;
  const member = reaction.message.guild.members.cache.get(user.id);

  if (member.user.bot) return;

  if (rolesEmojis[emoji]) {
    const role = reaction.message.guild.roles.cache.find(
      (r) => r.name === rolesEmojis[emoji]
    );
    member.roles.remove(role);
    console.log("Role removed.");
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

//-------POSTING AND AI
client.on("messageCreate", async (msg) => {
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
  if (
    msg.content === "!region" &&
    msg.member.roles.cache.some((role) => role.name === "Admin")
  ) {
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

        // interval function to remove extra emojis
        setInterval(async () => {
          try {
            for (const [key, reaction] of message.reactions.cache) {
              if (!rolesEmojis[reaction.emoji.name]) {
                const users = await reaction.users.fetch();
                for (const [userID, user] of users) {
                  await reaction.users.remove(userID);
                }
              }
            }
          } catch (error) {
            console.error("Failed to remove reactions.");
          }
        }, 2000); // interval of 2 seconds
      });
  }
});

//------------ HANDLING EVENTS ----------------
client.on(Events.InteractionCreate, async (interaction) => {
  //----------------------
  if (interaction.commandName === "invites") {
    if (interaction.channelId !== "1064794737544003594") {
      interaction.reply({
        embeds: [
          new EmbedBuilder().setDescription(
            `Looks like you're not in the correct channel.`
          ),
        ],
        ephemeral: true,
      });

      return;
    }

    if (message.react() === "🇨🇳") {
      interaction.reply({ content: "This is a test", emphemeral: true });
    }
  }

  if (interaction.isButton()) {
    //--FOR RESETTING AI CONVERSATION ---
    if (interaction.customId === "reset") {
      // Delete the file
      context = "";

      await interaction.reply({
        content: `${interaction.user}, conversation has been reset!`,
        ephemeral: false,
      });

      if (!context) {
        console.log("true");
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
          // Put the pen down
          context.closePath();
          // Clip off the region you drew on
          context.clip();

          // Using undici to make HTTP requests for better performance
          const { body } = await request(
            member.user.displayAvatarURL({ extension: "jpg" })
          );

          const avatar = await Canvas.loadImage(await body.arrayBuffer());
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
  }, 60000);
});

// //client.login(process.env.token);
// client.login(token);
// (async () => {
//   await connect(uri).catch(console.error);
// })();

//client.login(process.env.token);
client.login(process.env.token);
(async () => {
  await connect(process.env.uri).catch(console.error);
})();
