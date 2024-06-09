import {Schema, model} from "mongoose";

const acceptSchema = new Schema({
  id: String,
  type: String,
  actor: String,
  object: String,
  to: [String],
});

export default model("Accept", acceptSchema);
