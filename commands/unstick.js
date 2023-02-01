const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const stickySchema = require("../stickySchema/sticky");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unstick")
    .setDescription("Unstick a sticky message")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const data = await stickySchema.findOne({
      ChannelID: interaction.channel.id,
    });

    if (!data) {
      interaction.reply({
        content: "There is no sticky message in this channel",
        ephemeral: true,
      });
    } else {
      try {
        interaction.client.channels.cache
          .get(data.ChannelID)
          .messages.fetch(data.LastMessageID)
          .then(async (msg) => {
            await msg.delete();
          });
      } catch (err) {
        return;
      }

      stickySchema.deleteMany(
        { ChannelID: interaction.channel.id },
        async (err, data) => {
          if (err) throw err;

          await interaction.reply({
            content: `Sticky message deleted`,
            ephemeral: true,
          });
        }
      );
    }
  },
};
