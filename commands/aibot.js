const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const deleteFAQ = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("deleteFaq")
    .setLabel("Delete FAQ")
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId("createFile")
    .setLabel("Create File")
    .setStyle(ButtonStyle.Primary)
);

const embed = new EmbedBuilder()
  .setColor(0x0099ff)
  .setTitle("WARNING!")
  .setDescription("These buttons are for Admins only.");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot")
    .setDescription("Admin buttons for the bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.reply({
      embeds: [embed],
      components: [deleteFAQ],
    });
  },
};
