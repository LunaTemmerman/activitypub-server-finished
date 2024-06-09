import {Schema, model} from "mongoose";

const undoSchema = new Schema(
  {
    id: {type: String, required: true},
    type: {type: String, default: "Undo"},
    actor: {type: String, required: true},
    object: {type: Object, required: true},
    to: {type: [String], required: true},
  },
  {timestamps: true}
);
export default model("Undo", undoSchema);
