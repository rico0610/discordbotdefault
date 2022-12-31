const mongoose = require("mongoose");

const ConverstationSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: [true, "Discord user ID"]
    },
    conversation: [
        {
            messageContent: {
                type: String,
                required: [true, "Member's message"]
            },
        }
    ]
});

module.exports = mongoose.model("Conversations", ConverstationSchema);