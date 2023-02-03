const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  answer: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model("faqSchema", faqSchema);
