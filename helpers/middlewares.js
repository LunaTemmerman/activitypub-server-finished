export const extractUserId = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({errors: ["No token provided"]});
  }

  const token = authHeader.replace("Bearer ", "");
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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

// Signature verification middleware
export const verifySignature = async (req, res, next) => {
  try {
    const signatureHeader = req.headers.signature;
    if (!signatureHeader) {
      return res.status(400).send({errors: ["Signature header is missing"]});
    }

    // Extract signature parameters
    const {keyId, headers, signature} = parseSignatureHeader(signatureHeader);

    // Retrieve public key from the database based on keyId
    const publicKey = await getPublicKey(keyId);

    // Reconstruct signature string
    const signatureString = reconstructSignatureString(req, headers);

    // Verify signature
    const verified = verifySignature(signatureString, signature, publicKey);

    if (!verified) {
      return res.status(401).send({errors: ["Invalid signature"]});
    }

    next();
  } catch (error) {
    console.error("Error verifying signature:", error);
    res.status(500).send({errors: ["Internal Server Error"]});
  }
};

// Helper function to parse Signature header
export const parseSignatureHeader = (signatureHeader) => {
  // Parse signatureHeader and return keyId, headers, and signature
};

// Helper function to retrieve public key from the database
export const getPublicKey = async (keyId) => {
  // Fetch public key from the database based on keyId
};

// Helper function to reconstruct signature string
export const reconstructSignatureString = (req, headers) => {
  // Reconstruct signature string based on headers
};
