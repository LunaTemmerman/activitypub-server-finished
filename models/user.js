import {Schema, model} from "mongoose";

const userSchema = new Schema({
  id: String,
  type: String,
  preferredUsername: {type: String, unique: true},
  inbox: [String],
  outbox: [String],
  followers: [String],
  following: [String],
  liked: [String],
  shares: [String],
  email: String,
  password: String,
  publicKey: String,
  privateKey: String,
});

export default model("User", userSchema);
