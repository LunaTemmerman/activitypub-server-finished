import {Schema, model} from "mongoose";

const createSchema = new Schema({
  id: String,
  type: String,
  to: [String],
  actor: String,
  object: Object,
});

export default model("Create", createSchema);
