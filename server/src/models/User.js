
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address"
      ]
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role must be user or admin"
      },
      default: "user"
    }
  },
  {
    timestamps: true,
    collection: "users"
  }
);

// Email uniqueness is enforced by the unique index above.

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
