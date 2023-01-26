const {
  Events,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const Canvas = require("@napi-rs/canvas");
const { request } = require("node:https");
const wait = require("node:timers/promises").setTimeout;

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    //---- INTERACTION FOR MODAL ----
    if (!interaction.isModalSubmit()) return;

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "myModal") {
        await interaction.reply({
          content: "Your submission was received successfully!",
          ephemeral: true,
        });

        // Get the data entered by the user
        const favoriteColor =
          interaction.fields.getTextInputValue("favoriteColorInput");
        const hobbies = interaction.fields.getTextInputValue("hobbiesInput");
        console.log({ favoriteColor, hobbies });
      }

      //-- FOR TICKET SYSTEM --
      if (interaction.customId === "ticketModal") {
        const embedReply = new EmbedBuilder()
          .setDescription(
            `${interaction.user} thanks for opening a ticket. Someone from our team will be with you shortly.`
          )
          .setColor("#020303");

        interaction
          .reply({
            embeds: [embedReply],
            ephemeral: true,
          })
          .then(async () => {
            await wait(5000);
            await interaction.deleteReply();
          });

        const ticketInput = interaction.fields.getTextInputValue("ticketInput"); //-- getting the input
        const categoryId = "1056070016803549254";
        const modRoleId = "1056831538349752351";
        const everyoneId = "1056069438564220999";

        // Create the channel
        await interaction.guild.channels
          .create({
            name: `ticket-${interaction.user.id}`,
            parent: categoryId, // category
            permissionOverwrites: [
              {
                id: everyoneId,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
              {
                id: modRoleId,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageMessages,
                  PermissionsBitField.Flags.CreateInstantInvite,
                ],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                ],
                deny: [
                  PermissionsBitField.Flags.CreatePublicThreads,
                  PermissionsBitField.Flags.CreatePrivateThreads,
                ],
              },
            ],
          })
          .then(async (ticketChannel) => {
            const mod = interaction.guild.roles.cache.find(
              (r) => r.name === "moderator"
            );
            const admin = interaction.guild.roles.cache.find(
              (r) => r.name === "Admin"
            );

            const embedReply = new EmbedBuilder()
              .setTitle(`__Here's your ticket ${interaction.user.username}__`)
              .setDescription(
                "Please allow some time for our team to review your concern."
              )
              .setColor("#020303")
              .setThumbnail("https://i.imgur.com/wGWdsT7.png");

            const concernEmbed = new EmbedBuilder()
              .setTitle("__Concern:__")
              .setDescription(`${ticketInput}\n\n`)
              .addFields(
                { name: "\u200B", value: "\u200B" },
                {
                  name: "Reporter:",
                  value: `${interaction.user}`,
                  inline: true,
                },
                { name: "Assigned to:", value: `${admin} ${mod}`, inline: true }
              )
              .setColor("#020303");

            const closeButtonRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("closeButton")
                .setLabel("Close Ticket")
                .setStyle(ButtonStyle.Danger)
            );

            //-- SENDING THE TICKET INPUT TO THE CREATED CHANNEL --
            ticketChannel
              .send({
                embeds: [embedReply, concernEmbed],
                ephemeral: false,
                components: [closeButtonRow],
              })
              .then((msg) => msg.pin());
          });
      }
    }
  },
};
