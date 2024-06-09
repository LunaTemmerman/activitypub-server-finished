import {Router} from "express";
const router = Router();
import {parsePlatform, parseUser} from "../helpers/webfingerHelpers.js";
import axios from "axios";
import User from "../models/user.js";

router.get("/", async (req, res) => {
  try {
    const resource = req.query.resource;

    const platform = await parsePlatform(resource);
    const username = await parseUser(resource);
    console.log(resource);

    if (!username) {
      return res
        .status(404)
        .send({errors: ["Invalid request: User not found"]});
    } else if (!platform) {
      return res
        .status(404)
        .send({errors: ["Invalid Request: Platform not found"]});
    }

    if (platform === process.env.BASE_URL) {
      const user = await User.findOne({preferredUsername: username});
      if (!user) {
        return res.status(404).send({errors: ["User not found"]});
      }

      const response = {
        subject: resource,
        aliases: [user.id],
        links: [
          {
            rel: "self",
            type: "application/activity+json",
            href: user.id,
          },
          {
            rel: "inbox",
            type: "application/activity+json",
            href: `${user.id}/inbox`,
          },
          {
            rel: "outbox",
            type: "application/activity+json",
            href: `${user.id}/outbox`,
          },
          {
            rel: "followers",
            type: "application/activity+json",
            href: `${user.id}/followers`,
          },
          {
            rel: "following",
            type: "application/activity+json",
            href: `${user.id}/following`,
          },
          {
            rel: "liked",
            type: "application/activity+json",
            href: `${user.id}/liked`,
          },
          {
            rel: "shared",
            type: "application/activity+json",
            href: `${user.id}/shared`,
          },
        ],
      };

      res.status(200).json(response);
    } else {
      const response = await axios.get(
        `https://${platform}/.well-known/webfinger?resource=acct:${username}@${platform}`,
        {
          headers: {
            Accept: "application/activity+json",
          },
        }
      );
      return res.status(200).json(response.data);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
