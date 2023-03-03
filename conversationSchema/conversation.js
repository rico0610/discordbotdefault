const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  conversation: [
    {
      person: {
        type: String,
        required: true,
      },
      ai: {
        type: String,
        required: true,
      },
    },
  ],
  count: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("conversationSchema", conversationSchema);
