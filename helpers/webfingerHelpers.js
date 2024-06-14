import User from "../models/user.js";

async function parseUser(resource) {
  if (resource.indexOf(":") > -1 && resource.indexOf("@") > -1) {
    const parts = resource.split(":");
    const username = parts[1].split("@")[0];

    return username;
  } else {
    return null;
  }
}

async function parsePlatform(resource) {
  const resourceMatch = resource.match(/acct:([^@]+)@([^:]+(:\d+)?)/);
  if (resourceMatch) {
    const platform = resourceMatch[2];
    return platform;
  } else {
    return null;
  }
}

export {parseUser, parsePlatform};
