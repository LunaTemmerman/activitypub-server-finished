import {Router} from "express";
const router = Router();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("No token provided");
  }

  // Extract the token from the Authorization header (remove "Bearer " prefix)
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

router.get("/:username/followers", verifyToken, async (req, res) => {
  try {
    
  } catch {

  }
});

export default router;
