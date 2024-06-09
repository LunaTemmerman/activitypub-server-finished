import {config} from "dotenv";
config();
import cors from "cors";
import express from "express";
import bodyparser from "body-parser";
const {json} = bodyparser;
import {connect} from "mongoose";
import userRoutes from "./routes/user.js";
import webfingerRoutes from "./routes/webfinger.js";
import noteRoutes from "./routes/note.js";
import discoverRoutes from "./routes/discover.js";
import createRoutes from "./routes/create.js";
import webmentionRouter from "./routes/webmention.js";

const app = express();
app.use(cors());
app.use(json());

connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use("/users", userRoutes);
app.use("/.well-known/webfinger", webfingerRoutes);
app.use("/notes", noteRoutes);
app.use("/discover", discoverRoutes);
app.use("/creates", createRoutes);
app.use("/webmentions", webmentionRouter);

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
