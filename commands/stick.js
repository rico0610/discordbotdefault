const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const stickySchema = require("../stickySchema/sticky");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stick")
    .setDescription("Create a sticky message")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to stick in the channel")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("count")
        .setDescription("How frequently you want the message to be sent")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.Administrator
    )
    .setDMPermission(false),

  async execute(interaction) {
    let string = interaction.options.getString("message");
    let amount = interaction.options.getNumber("count") || 6;

    const embed = new EmbedBuilder()
      .setTitle(`Guide on how to chat with the bot`)
      .setDescription(string)
      .setFooter({ text: `This is a sticky message` });

    stickySchema.findOne(
      { channelID: interaction.channel.id },
      async (err, data) => {
        if (err) throw err;

        if (!data) {
          let msg = await interaction.channel.send({ embeds: [embed] });

          stickySchema.create({
            ChannelID: interaction.channel.id,
            Message: string,
            CurrentCount: 0,
            MaxCount: amount,
            LastMessageID: msg.id,
          });
          await interaction.reply({
            content: "Sticky message created",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There is already a sticky message in this channel",
            ephemeral: true,
          });
        }
      }
    );
  },
};
