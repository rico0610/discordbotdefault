const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invites")
    .setDescription("Get a uses server invite count"),
  // .addUserOption((option) =>
  //   option
  //     .setName("user")
  //     .setDescription("The user you want to check invites of")
  //     .setRequired(true)
  // ),

  async execute(interaction, message) {
    //const user = interaction.options.getUser("user");
    const user = interaction.user;
    let invites = await interaction.guild.invites.fetch();
    //console.log(invites);
    let userInv = invites.filter((u) => u.inviter && u.inviter.id === user.id);

    console.log(userInv);

    let i = 0;
    userInv.forEach((inv) => (i += inv.uses));

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(`✅ ${user.tag} has **${i}** invites.`);

    await interaction.reply({ embeds: [embed] });
  },
};
