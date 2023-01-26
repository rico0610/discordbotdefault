const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const wait = require("node:timers/promises").setTimeout;

const regionEmbed = new EmbedBuilder()
  .setTitle(`**__Regional Community__**`)
  .setDescription("React your country's flag to access regional channel.")
  .setThumbnail("https://media.tenor.com/zlN3e54Y-uwAAAAi/victim1-map.gif")
  .setColor("#642c5c");

module.exports = {
  data: new SlashCommandBuilder().setName("react").setDescription("React test"),
  async execute(interaction) {},
};
