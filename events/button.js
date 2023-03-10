const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { Captcha } = require("captcha-canvas");
const { writeFileSync } = require("fs");
const discordTranscripts = require("discord-html-transcripts");
const firstResponse = require("../firstResponseSchema/firstResponse");

const wait = require("node:timers/promises").setTimeout;

let captchaText;

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    //if(!interaction.isButton()) return

    if (interaction.isButton()) {
      if (interaction.customId === "primary") {
        interaction.update({
          content: `You've clicked submit button!`,
          ephemeral: true,
          components: [],
        }); //-- REMOVING THE BUTTONS --
      } else if (interaction.customId === "danger") {
        interaction.reply({
          content: `You've clicked cancel button!`,
          ephemeral: true,
        });
      }

      //--- FOR TICKET CREATION ---
      if (interaction.customId === "ticketCreate") {
        const openTicket = interaction.guild.channels.cache.some(
          (channel) => channel.name === `ticket-${interaction.user.id}`
        );

        if (openTicket) {
          await interaction
            .reply({
              embeds: [
                new EmbedBuilder().setDescription(
                  "**You have already opened a ticket.**"
                ),
              ],
              ephemeral: true,
            })
            .then(async () => {
              await wait(5000);
              await interaction.deleteReply();
            });
        } else {
          const modal = new ModalBuilder()
            .setCustomId("ticketModal")
            .setTitle("Create Ticket");

          const ticket = new TextInputBuilder()
            .setCustomId("ticketInput")
            .setLabel("Concern")
            .setStyle(TextInputStyle.Paragraph);

          const ticketRow = new ActionRowBuilder().addComponents(ticket);
          modal.addComponents(ticketRow);

          await interaction.showModal(modal);
        }
      }

      //--- FOR CLOSING A TICKET ---
      if (interaction.customId === "closeButton") {
        try {
          const ticketToClose = interaction.guild.channels.cache.find(
            (channel) => channel.name === interaction.message.channel.name
          );

          if (!ticketToClose) {
            console.log(ID);
            console.log("ticket channel not found");
          } else {
            // delete the data from firstResponse in the database
            await firstResponse.findOneAndDelete({
              channelId: ticketToClose.id,
            });

            // get the timestamp of the ticket that is being closed
            const date = new Date();
            const timestamp = date.getTime();
            // convert the timestamp to date format
            const dateObject = new Date(timestamp);
            const humanDateFormat = dateObject.toLocaleString();

            ticketToClose
              .send({
                embeds: [
                  new EmbedBuilder()
                    .setDescription(`**Ticket Closed:** ${humanDateFormat}`)
                    .setColor("#020303"),
                ],
              })
              .then(async () => {
                const attachment = await discordTranscripts.createTranscript(
                  ticketToClose
                );

                const transcriptsChannel =
                  await interaction.guild.channels.cache.find(
                    (channel) => channel.id === "1067190447291781230"
                  );

                transcriptsChannel.send({
                  content: `Ticket close by ${interaction.user}`,
                  files: [attachment],
                });
              });
          }

          interaction.update({
            components: [],
            ephemeral: false,
          });

          interaction.channel
            .send({
              embeds: [
                new EmbedBuilder()
                  .setDescription("**Closing the ticket in a few seconds...**")
                  .setColor("#020303"),
              ],
              ephemeral: false,
            })
            .then(async () => {
              await wait(5000);
              await interaction.channel.delete();
            });
        } catch (error) {
          console.error(error);
        }
      }

      //--- FOR VOICE CHANNEL CREATION ---
      if (interaction.customId === "voiceTicket") {
        const voiceCatID = "1061881939637850165";
        const modRoleId = "1056831538349752351";
        const everyoneId = "1056069438564220999";
        await interaction.guild.channels
          .create({
            name: `voice-${interaction.user.username}`,
            type: ChannelType.GuildVoice,
            parent: voiceCatID, // voice category
            permissionOverwrites: [
              {
                id: everyoneId,
                deny: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.CreateInstantInvite,
                ],
              },
              {
                id: modRoleId,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.CreateInstantInvite,
                ],
              },
              {
                id: interaction.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel],
              },
            ],
          })
          .then(() => {
            const embedReply = new EmbedBuilder()
              .setDescription(
                `${interaction.user}, thanks for creating a voice channel. Someone from our team will be with you shortly.`
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
          });
      }

      //--- FOR VERIFY ---
      if (interaction.customId === "verify") {
        const continueRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("continue")
            .setLabel("Continue")
            .setStyle(ButtonStyle.Primary)
        );

        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "Before you continue, we highly recommend turning off your DMs on this server."
              )
              .setDescription(
                "This is to prevent spam and to keep your privacy safe.\nTo turn off your DMs, follow the guide below:\n\n??? Right-click on this server's icon\n??? Click on ` Privacy Settings `\n??? Turn off direct messages\n??? Click on ` Done `\n\n Once you're done, click on the ` Continue ` button below to complete the verification.`"
              )
              .setColor("#383434")
              .setImage(
                "https://cdn.discordapp.com/attachments/991159496359542808/1069788006795456644/offdm.gif"
              ),
          ],
          components: [continueRow],
          ephemeral: true,
        });
      }

      if (interaction.customId === "continue") {
        // --- RANDOM CAPTCHA ----
        const captcha = new Captcha(); //create a captcha canvas of 100x300.
        captcha.async = false; //Sync
        captcha.addDecoy(); //Add decoy text on captcha canvas.
        captcha.drawTrace(); //draw trace lines on captcha canvas.
        captcha.drawCaptcha(); //draw captcha text on captcha canvas.

        writeFileSync("captcha.png", captcha.png); //create 'captcha.png' file in your directory.

        captchaText = captcha.text;

        console.log(captchaText);

        const captchaEmbed = new EmbedBuilder()
          .setTitle(`**Hello! Let's find out if you're a human.**`)
          .setDescription(
            "`Please type the captcha below to be able to access this server!`"
          )
          .setColor("#383434")
          .setImage("attachment://captcha.png")
          .setFooter({ text: "Verification Period: 1 minute" });

        const file = new AttachmentBuilder("./captcha.png");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("answerMe")
            .setLabel("Answer")
            .setStyle(ButtonStyle.Success)
        );

        await interaction
          .reply({
            embeds: [captchaEmbed],
            files: [file],
            ephemeral: true,
            components: [row],
          })
          .then(async () => {
            await wait(60000);
            await interaction.deleteReply();
          });
      }

      if (interaction.customId === "answerMe") {
        const modal = new ModalBuilder()
          .setCustomId("captchaAnswer")
          .setTitle("Captcha Answer");

        const answer = new TextInputBuilder()
          .setCustomId("answerInput")
          .setLabel("ANSWER")
          .setStyle(TextInputStyle.Short);

        const answerRow = new ActionRowBuilder().addComponents(answer);
        modal.addComponents(answerRow);

        await interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      // -- FOR VERIFICATION --
      if (interaction.customId === "captchaAnswer") {
        const captchaAnswer =
          interaction.fields.getTextInputValue("answerInput");
        if (captchaAnswer !== captchaText) {
          const embedReply = new EmbedBuilder()
            .setDescription("??? `Incorrect captcha! Please try again.`")
            .setColor("#383434");

          await interaction
            .reply({
              embeds: [embedReply],
              ephemeral: true,
            })
            .then(async () => {
              await wait(5000);
              await interaction.deleteReply();
            });
        } else {
          const role = interaction.guild.roles.cache.find(
            (r) => r.name === "member"
          );
          await interaction.member.roles.add(role); // assigning a role member

          const embedReply = new EmbedBuilder()
            .setTitle("Welcome to the server!")
            .setDescription(`You're now verified`)
            .setColor("#383434");

          const welcomeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Start Here")
              .setStyle(ButtonStyle.Link)
              .setURL(
                "https://discord.com/channels/1056069438564220999/1060012861818150913"
              )
          );

          await interaction
            .reply({
              embeds: [embedReply],
              components: [welcomeRow],
              ephemeral: true,
            })
            .then(async () => {
              await wait(60000);
              await interaction.deleteReply();
            });
        }
      }
    }
  },
};
