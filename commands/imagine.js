const {
  SlashCommandBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Embed,
  EmbedBuilder,
} = require("discord.js");

const wait = require("node:timers/promises").setTimeout;

// //FOR TESTING
// const { tokenKey } = require("../config.json");

const openjourneyVersion =
  "9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("imagine")
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("The prompt for the image")
        .setRequired(true)
    )
    .setDescription("Imagine an image!"),
  async execute(interaction) {
    const prompt = interaction.options.getString("prompt");

    await interaction.deferReply();

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.tokenKey}`,
      },
      body: JSON.stringify({
        version: `${openjourneyVersion}`,
        input: {
          prompt: prompt,
        },
      }),
    };

    const imageResponse = await fetch(
      "https://api.replicate.com/v1/predictions",
      options
    );

    if (!imageResponse.ok) {
      throw new Error(
        `HTTP error ${imageResponse.status}: ${imageResponse.statusText}`
      );
    }

    const imageData = await imageResponse.json();

    let isFetch = false;
    let numRetries = 0;
    const maxRetries = 3;
    const delayMs = 1000;

    while (!isFetch) {
      await wait(8000).then(async () => {
        try {
          const getImage = {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${process.env.tokenKey}`,
            },
          };
          const statusResponse = await fetch(
            `https://api.replicate.com/v1/predictions/${imageData.id}`,
            getImage
          );

          const statusData = await statusResponse.json();

          console.log(statusData.output);

          await interaction
            .editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(prompt)
                  .setImage(`${statusData.output[0]}`)
                  .setColor("#303434"),
              ],
            })
            .then(() => {
              isFetch = true;
              return;
            });
        } catch (err) {
          if (numRetries === maxRetries) {
            console.log(err);
            await interaction.editReply({
              content: `There was an error getting the image. Please try again.`,
            });

            return;
          } else {
            numRetries += 1;
            console.log(`OpenAI Error\n${err}`);
            console.log(`Error. Retrying in ${delayMs} ms.`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      });
    }
  },
};
