import {Schema, model} from "mongoose";

const announceSchema = new Schema({
  id: String,
  type: String,
  actor: String,
  object: Object,
  to: [String],
});

export default model("Announce", announceSchema);
