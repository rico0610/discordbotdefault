const mongoose = require("mongoose");

const userLevelSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: [true, "Discord user ID"],
  },
  xp: {
    type: Number,
    required: [true, "Memeber's xp"],
  },
  level: {
    type: Number,
    required: [true, "Memeber's level"],
  },
  lastMessage: {
    type: Number,
    require: [true, "Member's last time of message"],
  },
});

module.exports = mongoose.model("userLevel", userLevelSchema);
