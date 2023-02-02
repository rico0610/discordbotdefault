const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  answer: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("faqSchema", faqSchema);
