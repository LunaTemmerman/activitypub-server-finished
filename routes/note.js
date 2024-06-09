import {Router} from "express";
import Note from "../models/note.js";
import {translateNoteToActivity} from "../helpers/translateResponseHelpers.js";
import {extractUserId, verifyToken} from "./user.js";
const router = Router();

// Get post by ID
router.get("/:id", verifyToken, extractUserId, async (req, res) => {
  const postId = req.params.id;

  try {
    let post = await Note.findOne({
      id: `${process.env.BASE_URL}/notes/${postId}`,
    });
    if (!post) {
      return res.status(404).send({errors: ["Post not found"]});
    }

    const userId = `${process.env.BASE_URL}/users/${req.userId}`;
    if (
      post.cc.includes("https://www.w3.org/ns/activitystreams#Public") ||
      post.to.includes("https://www.w3.org/ns/activitystreams#Public") ||
      post.cc.includes(userId) ||
      post.to.includes(userId)
    ) {
      const acitivity = translateNoteToActivity(post);
      res.status(200).json(acitivity);
    } else {
      res
        .status(403)
        .send({errors: ["You are unauthorized to see this post."]});
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
