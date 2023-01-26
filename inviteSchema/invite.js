const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema({
  inviterID: {
    type: String,
    required: [true, "Inviter ID"],
  },
  inviteeID: {
    type: String,
    required: [true, "Invitee ID"],
  },
  code: {
    type: String,
    required: [true, "Inviter unique code"],
  },
  inviteCount: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("invite", inviteSchema);
