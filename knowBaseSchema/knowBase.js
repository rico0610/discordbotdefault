const mongoose = require("mongoose");

const knowBaseSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  keywords: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model("knowBaseSchema", knowBaseSchema);
