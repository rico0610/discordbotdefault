const { SlashCommandBuilder } = require("discord.js");

const wait = require("node:timers/promises").setTimeout;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("toss")
    .setDescription("Command for toss a coin game!"),
  async execute(interaction) {
    await interaction.reply({
      content: "!toss",
      ephemeral: false,
    });
  },
};
