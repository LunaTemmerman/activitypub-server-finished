import {Schema, model} from "mongoose";

const likeSchema = new Schema({
  id: String,
  type: String,
  actor: String,
  object: String,
  to: [String],
});

export default model("Like", likeSchema);
