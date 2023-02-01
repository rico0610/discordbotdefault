const mongoose = require("mongoose");

const stickySchema = new mongoose.Schema({
  ChannelID: {
    type: String,
    required: true,
  },
  Message: {
    type: String,
    required: true,
  },
  CurrentCount: {
    type: Number,
    required: true,
  },
  MaxCount: {
    type: Number,
    required: true,
  },
  LastMessageID: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("stickySchema", stickySchema);
