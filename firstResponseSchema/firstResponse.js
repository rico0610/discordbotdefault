const mongoose = require("mongoose");

const firstResponseSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("firstResponseSchema", firstResponseSchema);
