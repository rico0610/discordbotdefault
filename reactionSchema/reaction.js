const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema({
  emoji: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("reaction", reactionSchema);
