import {Router} from "express";
const router = Router();
import User from "../models/user.js";
import jsonwebtoken from "jsonwebtoken";
const {verify, sign} = jsonwebtoken;
import bcryptjs from "bcryptjs";
const {hash, compare} = bcryptjs;
import {
  isValidUrlOrId,
  validateNote,
  createNoteDocument,
  wrapNoteInCreate,
  validateLike,
  createLikeDocument,
  validateAnnounce,
  createAnnounceDocument,
  deliverActivity,
  validateFollow,
  createFollowDocument,
  getUser,
  createAcceptDocument,
  createUndoDocument,
} from "../helpers/userHelpers.js";
import {generateKeyPairSync} from "crypto";
import Follow from "../models/follow.js";

export const extractUserId = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({errors: ["No token provided"]});
  }

  const token = authHeader.replace("Bearer ", "");
  verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({errors: ["Invalid token"]});
    }
    req.userId = decoded.id;
    next();
  });
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("No token provided");
  }

  const token = authHeader.replace("Bearer ", "");

  verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send("Invalid token");
    }
    req.decoded = decoded;
    next();
  });
};

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const {username, email, password} = req.body;

    const existingUser = await User.findOne({preferredUsername: username});
    if (existingUser) {
      return res.status(409).send("Username already taken");
    }

    const hashedPassword = await hash(password, 10);

    const {publicKey, privateKey} = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {type: "spki", format: "pem"},
      privateKeyEncoding: {type: "pkcs8", format: "pem"},
    });

    const newUser = new User({
      id: `${process.env.BASE_URL}/users/${username}`,
      type: "Person",
      preferredUsername: username,
      email: email,
      password: hashedPassword,
      publicKey: publicKey,
      privateKey: privateKey,
    });

    await newUser.save();
    res.status(201).send("User created successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating user");
  }
});

// Signin route
router.post("/signin", async (req, res) => {
  try {
    const {email, password} = req.body;

    const user = await User.findOne({email});
    if (!user) {
      return res.status(404).send({errors: ["User not found"]});
    }

    const isMatch = compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({error: ["Invalid credentials"]});
    }

    const token = sign({id: user._id}, process.env.JWT_SECRET);

    res.status(200).json({token, username: user.preferredUsername});
  } catch (error) {
    res.status(500).send({errors: ["Internal Server Error"]});
  }
});

// Get user profile
router.get("/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const user = await User.findOne({preferredUsername: username});

    if (!user) {
      return res.status(404).send("User not found");
    }

    const userProfile = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: user.id,
      type: user.type,
      preferredUsername: user.preferredUsername,
      inbox: `${user.id}/inbox`,
      outbox: `${user.id}/outbox`,
      followers: `${user.id}/followers`,
      following: `${user.id}/following`,
      shared: `${user.id}/shared`,
      liked: `${user.id}/liked`,
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Get user's outbox
router.get("/:username/outbox", async (req, res) => {
  try {
    const {username} = req.params;

    const user = await User.findOne({preferredUsername: username});
    if (!user) {
      return res.status(404).send({errors: ["User not found"]});
    }

    const collection = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${user.id}/outbox`,
      summary: `${user.preferredUsername}'s outbox`,
      type: "OrderedCollection",
      totalItems: user.outbox.length,
      orderedItems: user.outbox,
    };

    return res.status(200).json(collection);
  } catch (error) {
    res.status(500).send({errors: ["Internal Server Error"]});
  }
});

// Get user's inbox (Protected route)
router.get("/:username/inbox", verifyToken, async (req, res) => {
  try {
    const {username} = req.params;
    const decoded = req.decoded;

    // Find the user by username
    const user = await User.findOne({preferredUsername: username});
    if (!user) {
      return res.status(404).send({errors: ["User not found"]});
    }

    // Check if the requesting user matches the owner of the inbox
    if (decoded.id !== user._id.toString()) {
      return res.status(403).send("Unauthorized access to this inbox");
    }

    // Construct the ActivityStreams collection object for inbox
    const collection = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${user.id}/inbox`,
      summary: `${user.preferredUsername}'s inbox`,
      type: "OrderedCollection",
      totalItems: user.inbox.length,
      orderedItems: user.inbox,
    };

    res.status(200).json(collection);
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.status(500).send({errors: ["Internal Server Error"]});
  }
});

// Post to user's outbox (Protected route)
router.post("/:username/outbox", verifyToken, async (req, res) => {
  try {
    const {username} = req.params;
    const activity = req.body;

    const user = await User.findOne({preferredUsername: username});
    if (!user) {
      return res.status(404).send({errors: ["User not found"]});
    }

    let activityDocument;
    if (activity.type === "Note") {
      const errors = validateNote(activity);
      if (errors.length > 0) {
        return res.status(400).send({errors: errors});
      }

      activityDocument = await createNoteDocument(activity, user);
      await activityDocument.save();
      activityDocument = await wrapNoteInCreate(activityDocument, user);
    } else if (activity.type === "Like") {
      const errors = validateLike(activity);
      if (errors.length > 0) {
        return res.status(400).send({errors: errors});
      }

      activityDocument = createLikeDocument(activity, user);
      user.liked.push(activityDocument.id);
    } else if (activity.type === "Announce") {
      const errors = validateAnnounce(activity);
      if (errors.length > 0) {
        return res.status(400).send({errors: errors});
      }

      activityDocument = createAnnounceDocument(activity, user);
    } else if (activity.type === "Follow") {
      const errors = validateFollow(activity);
      if (errors.length > 0) {
        return res.status(400).send({errors: errors});
      }

      activityDocument = createFollowDocument(activity, user);
      user.following.push(activityDocument.object);
    } else if (activity.type === "Accept") {
      activityDocument = createAcceptDocument(activity, user);
      if (activity.object.type === "Follow") {
        user.followers.push(activity.object.actor);
      }
    } else if (activity.type === "Undo") {
      console.log(activity);
      const followactivity = await Follow.findOne({
        actor: user.id,
        object: activity.followed,
      });
      if (!followactivity) {
        return res
          .status(404)
          .send({errors: ["The followed person was not found"]});
      }

      activityDocument = createUndoDocument({object: followactivity}, user);
      user.following = user.following.filter(
        (followingId) => followingId !== followactivity.object
      );
    } else {
      return res.status(400).send({errors: ["Unsupported activity type"]});
    }

    activityDocument["@context"] = "https://www.w3.org/ns/activitystreams";

    const {deliveryPromises, error} = deliverActivity(activityDocument);
    if (error) {
      return res.status(error.code).send({errors: [error.message]});
    } else {
      await Promise.all(deliveryPromises);
      await activityDocument.save();
      user.outbox.push(activityDocument.id);
      await user.save();

      res.status(201).send("Activity added to outbox");
    }
  } catch (error) {
    if (!res.headersSent) {
      console.error(error);
      res.status(500).send({errors: ["Internal Server Error"]});
    }
  }
});

// Post to user's inbox
router.post("/:username/inbox", async (req, res) => {
  try {
    const {username} = req.params;
    const activity = req.body;

    const user = await User.findOne({preferredUsername: username});
    if (!user) {
      return res.status(404).send({errors: ["User not found"]});
    }

    const response = await get(objectId);
    if (response.status !== 200) {
      return res.status(400).send({errors: ["Invalid activity object ID"]});
    }

    if (response.data.type === "Follow") {
      const response = await post(`${response.data.object}/outbox`, {
        type: "Accept",
        object: response.data,
      });
    }

    user.inbox.push(activity.id);
    await user.save();

    res.status(201).send("Activity added to inbox");
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).send({errors: ["Internal Server Error"]});
    }
  }
});

router.get("/:username/followers", verifyToken, async (req, res) => {
  try {
    const {username} = req.params;
    const decoded = req.decoded;

    // Find the user by username
    const user = await User.findOne({preferredUsername: username});
    if (!user) {
      return res.status(404).send({errors: ["User not found"]});
    }

    if (decoded.id !== user._id.toString()) {
      return res.status(403).send("Unauthorized access to this folllowing");
    }

    const collection = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${user.id}/followers`,
      summary: `${user.preferredUsername}'s followers`,
      type: "OrderedCollection",
      totalItems: user.followers.length,
      orderedItems: user.followers,
    };

    res.status(200).json(collection);
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).send({errors: ["Internal Server Error"]});
  }
});

router.get("/:username/following", verifyToken, async (req, res) => {
  try {
    const {username} = req.params;
    const decoded = req.decoded;

    // Find the user by username
    const user = await User.findOne({preferredUsername: username});
    if (!user) {
      return res.status(404).send({errors: ["User not found"]});
    }

    if (decoded.id !== user._id.toString()) {
      return res.status(403).send("Unauthorized access to this following");
    }

    const collection = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${user.id}/following`,
      summary: `${user.preferredUsername}'s following`,
      type: "OrderedCollection",
      totalItems: user.following.length,
      orderedItems: user.following,
    };

    res.status(200).json(collection);
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).send({errors: ["Internal Server Error"]});
  }
});

export default router;
