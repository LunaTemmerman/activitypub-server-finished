import {Schema, model} from "mongoose";

const noteSchema = new Schema({
  id: String,
  type: String,
  content: String,
  attributedTo: String,
  to: [String],
  cc: [String],
});

export default model("Note", noteSchema);
