const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
    },
    { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;