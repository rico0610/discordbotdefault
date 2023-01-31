const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  conversation: [
    {
      customer: {
        type: String,
        required: true,
      },
      ai: {
        type: String,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model("conversationSchema", conversationSchema);
