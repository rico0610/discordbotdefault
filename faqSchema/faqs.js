const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  NOTES: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model("faqSchema", faqSchema);
