import {Schema, model} from "mongoose";

const followSchema = new Schema({
  id: String,
  type: String,
  actor: String,
  object: String,
  to: [String],
});

export default model("Follow", followSchema);
