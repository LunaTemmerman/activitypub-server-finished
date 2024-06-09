import axios from "axios";
import Create from "../models/create.js";
import Note from "../models/note.js";
import Like from "../models/like.js";
import Accept from "../models/accept.js";
import Follow from "../models/follow.js";
import {v4 as uuidv4} from "uuid";
import Undo from "../models/undo.js";

const publicAddress = "https://www.w3.org/ns/activitystreams#Public";

function isValidUrlOrId(value) {
  try {
    new URL(value);
    return true;
  } catch (_) {
    return /^[a-f0-9]{24}$/.test(value);
  }
}

function validateNote(activity) {
  const errors = [];
  if (!activity.content || !activity.publicity) {
    errors.push("A post needs a content and to attributes.");
  }
  if (
    activity.publicity !== "public" &&
    activity.publicity !== "unlisted" &&
    activity.publicity !== "followers" &&
    activity.publicity !== "private"
  ) {
    errors.push("The publicity level is invalid.");
  }
  if (activity.publicity === "private") {
    if (!activity.to) {
      errors.push(
        "When sending private messages, a 'to' attribute is required."
      );
    }
    if (!Array.isArray(activity.to) || activity.to.length === 0) {
      errors.push(
        "The 'to' attribute needs to contain at least one recipient."
      );
    }
    for (const recipient of activity.to) {
      if (!isValidUrlOrId(recipient)) {
        errors.push(`Invalid recipient: ${recipient}`);
      }
    }
  }

  if (activity.content.length < 1 || activity.content.length > 1000) {
    errors.push("Content length must be between 1 and 1000 characters.");
  }

  if (activity.inReplyTo) {
    if (!isValidUrlOrId(activity.inReplyTo)) {
      errors.push("The reply id must be a valid URL.");
    }
  }

  return errors;
}

async function createNoteDocument(activity, user) {
  let noteDocument;

  if (activity.publicity === "public") {
    noteDocument = new Note({
      id: `${process.env.BASE_URL}/notes/${uuidv4()}`,
      type: "Note",
      content: activity.content,
      attributedTo: user.id,
      to: [publicAddress],
      cc: user.followers,
    });
  } else if (activity.publicity == "unlisted") {
    noteDocument = new Note({
      id: `${process.env.BASE_URL}/notes/${uuidv4()}`,
      type: "Note",
      content: activity.content,
      attributedTo: user.id,
      to: user.followers,
      cc: [publicAddress],
    });
  } else if (activity.publicity === "followers") {
    noteDocument = new Note({
      id: `${process.env.BASE_URL}/notes/${uuidv4()}`,
      type: "Note",
      content: activity.content,
      attributedTo: user.id,
      to: user.followers,
      cc: [],
    });
  } else if (activity.publicity === "private") {
    noteDocument = new Note({
      id: `${process.env.BASE_URL}/notes/${uuidv4()}`,
      type: "Note",
      content: activity.content,
      attributedTo: user.id,
      to: activity.to,
      cc: [],
    });
  }

  if (activity.inReplyTo) {
    noteDocument.inReplyTo = activity.inReplyTo;
  }

  return noteDocument;
}

async function wrapNoteInCreate(noteDocument, user) {
  const createDocument = new Create({
    id: `${process.env.BASE_URL}/creates/${uuidv4()}`,
    type: "Create",
    to: noteDocument.to,
    cc: noteDocument.cc,
    actor: noteDocument.attributedTo,
    object: noteDocument,
  });
  return createDocument;
}

function validateLike(activity) {
  const errors = [];

  if (!activity.object || typeof activity.object !== "string") {
    errors.push("Invalid or missing 'object'");
  }

  if (!isValidUrlOrId(activity.object)) {
    errors.push("Object has to be a valid URL.");
  }

  if (!activity.to) {
    errors.push("A 'to' attribute is required.");
  }
  if (!Array.isArray(activity.to) || activity.to.length === 0) {
    errors.push("The 'to' attribute needs to contain at least one recipient.");
  }
  for (const recipient of activity.to) {
    if (!isValidUrlOrId(recipient)) {
      errors.push(`Invalid recipient: ${recipient}`);
    }
  }

  return errors;
}

function createLikeDocument(activity, user) {
  const likeDocument = new Like({
    id: `${process.env.BASE_URL}/likes/${uuidv4()}`,
    type: "Like",
    actor: user.id,
    object: activity.object,
    to: activity.to,
  });
  return likeDocument;
}

function validateAnnounce(activity) {
  const errors = [];

  if (!activity.object || typeof activity.object !== "object") {
    errors.push("Invalid or missing 'object'");
  }

  if (!isValidUrlOrId(activity.object)) {
    errors.push("Object has to be a valid URL.");
  }
}

function createAnnounceDocument(activity, user) {
  const activityDocument = new Announce({
    id: `${process.env.BASE_URL}/announcements/${uuidv4()}`,
    type: "Announce",
    actor: user.id,
    object: activity.object,
    to: [publicAddress],
  });
  return activityDocument;
}

function deliverActivity(document) {
  let error = null;
  let deliveryPromises = null;
  if (document.to && document.cc) {
    deliveryPromises = [...document.to, ...document.cc].map(
      async (recipient) => {
        try {
          const response = await axios.get(recipient);
          if (!response.data) {
            error = {
              code: 400,
              message: `The recipient ${recipient} does not exist.`,
            };
          } else if (!response.data.inbox) {
            error = {
              code: 400,
              message: `The recipient ${recipient} does not have an inbox address.`,
            };
          } else {
            await axios.post(response.data.inbox, createDocument, {
              headers: {
                "Content-Type": "application/ld+json",
              },
            });
          }
        } catch (error) {
          console.error(error);
          error = {
            code: 500,
            message: `Internal Server Error: Failed to deliver acitivity to ${recipient}`,
          };
        }
      }
    );
  } else if (document.to && !document.cc) {
    deliveryPromises = document.to.map(async (recipient) => {
      try {
        const response = await axios.get(recipient);
        if (!response.data) {
          error = {
            code: 400,
            message: `The recipient ${recipient} does not exist.`,
          };
        } else if (!response.data.inbox) {
          error = {
            code: 400,
            message: `The recipient ${recipient} does not have an inbox address.`,
          };
        } else {
          await axios.post(response.data.inbox, createDocument, {
            headers: {
              "Content-Type": "application/ld+json",
            },
          });
        }
      } catch (error) {
        console.error(error);
        error = {
          code: 500,
          message: `Internal Server Error: Failed to deliver acitivity to ${recipient}`,
        };
      }
    });
  }

  if (error) {
    return {deliveryPromises: null, error};
  } else {
    return {deliveryPromises, error: null};
  }
}

function validateFollow(activity) {
  const errors = [];

  if (!activity.object || typeof activity.object !== "string") {
    errors.push("Invalid or missing 'object'");
  }

  if (!isValidUrlOrId(activity.object)) {
    errors.push("Object has to be a valid URL.");
  }

  return errors;
}

function createFollowDocument(activity, user) {
  const followDocument = new Follow({
    id: `${process.env.BASE_URL}/followrequests/${uuidv4()}`,
    type: "Follow",
    actor: user.id,
    object: activity.object,
    to: [activity.object],
  });
  return followDocument;
}

async function getUser(id) {
  let error = "";
  let data = null;
  try {
    const response = await axios.get(id);
    if (!response.data) {
      error = {
        code: 400,
        message: `The recipient ${recipient} does not exist.`,
      };
    } else {
      data = response.data;
    }
  } catch (resperror) {
    error = {
      code: 500,
      message: "Internal server error",
    };
  }

  if (error.length > 0) {
    return {data: null, error};
  } else {
    return {data, error: null};
  }
}

function createAcceptDocument(activity, user) {
  const acceptDocument = new Accept({
    id: `${process.env.BASE_URL}/accepts/${uuidv4()}`,
    type: "Accept",
    actor: user.id,
    object: activity.object,
    to: [activity.object.actor],
  });
  return acceptDocument;
}

function createUndoDocument(activity, user) {
  console.log(activity.object);
  const undoDocument = new Undo({
    id: `${process.env.BASE_URL}/undo/${uuidv4()}`,
    type: "Undo",
    actor: user.id,
    object: activity.object.id,
    to: activity.object.to,
  });
  return undoDocument;
}

export {
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
};
