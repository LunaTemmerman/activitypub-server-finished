import {Schema, model} from "mongoose";

const WebmentionSchema = new Schema({
  source: {type: String, required: true},
  target: {type: String, required: true},
  receivedAt: {type: Date, default: Date.now},
});

export default model("Webmention", WebmentionSchema);
