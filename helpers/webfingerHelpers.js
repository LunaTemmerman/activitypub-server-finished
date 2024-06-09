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
  if (resource.indexOf(":") > -1 && resource.indexOf("@") > -1) {
    const parts = resource.split(":");
    const platform = parts[1].split("@")[1];

    return platform;
  } else {
    return null;
  }
}

export {parseUser, parsePlatform};
