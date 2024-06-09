import {extractUserId, verifyToken} from "./user.js";
import Create from "../models/create.js";
import {Router} from "express";
import {
  translateCreateToActivity,
  translateNoteToActivity,
} from "../helpers/translateResponseHelpers.js";
import User from "../models/user.js";
const router = Router();

// Get post by ID
router.get("/:id", verifyToken, extractUserId, async (req, res) => {
  const postId = req.params.id;

  try {
    let post = await Create.findOne({
      id: `${process.env.BASE_URL}/creates/${postId}`,
    });
    if (!post) {
      return res.status(404).send({errors: ["Post not found"]});
    }

    const user = await User.findById(req.userId);

    if (
      post.object.cc.includes("https://www.w3.org/ns/activitystreams#Public") ||
      post.object.to.includes("https://www.w3.org/ns/activitystreams#Public") ||
      post.object.cc.includes(user.id) ||
      post.object.to.includes(user.id) ||
      post.actor === user.id
    ) {
      const activity = translateCreateToActivity(post);
      res.status(200).json(activity);
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
