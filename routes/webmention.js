import axios from "axios";
import {Router} from "express";
import Webmention from "../models/webmention.js";
const router = Router();

router.post("/", async (req, res) => {
  const {source, target} = req.body;

  if (!source || !target) {
    return res.status(400).send("Source and target parameters are required.");
  }

  try {
    const response = await axios.get(source);
    const html = response.data;

    if (html.includes(target)) {
      const newWebmention = new Webmention({source, target});
      await newWebmention.save();

      res.status(201).send("Webmention received.");
    } else {
      res.status(400).send("Target URL not mentioned in source URL.");
    }
  } catch (error) {
    console.error(`Error fetching source URL: ${error.message}`);
    res.status(400).send("Failed to fetch source URL.");
  }
});

// Endpoint to get all Webmentions
router.get("/", async (req, res) => {
  try {
    const webmentions = await Webmention.find().sort({receivedAt: -1});
    res.status(200).json(webmentions);
  } catch (error) {
    console.error("Error fetching Webmentions:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
