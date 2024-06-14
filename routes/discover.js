import axios from "axios";
import {Router} from "express";
const router = Router();

router.get("/:term", async (req, res) => {
  const {term} = req.params;

  const [username, platform] = term.split("@");
  console.log("plaform: " + platform);

  if (!username || !platform) {
    return res
      .status(400)
      .send({errors: ["Invalid term format. Must be username@platform."]});
  }

  try {
    const webfingerResponse = await axios.get(
      `https://${platform}/.well-known/webfinger?resource=acct:${term}`
    );

    if (
      webfingerResponse.data &&
      webfingerResponse.data.aliases &&
      webfingerResponse.data.aliases.length > 0
    ) {
      const aliasUrl = webfingerResponse.data.aliases[0];

      try {
        const aliasResponse = await axios.get(aliasUrl, {
          headers: {
            Accept: "application/activity+json",
          },
        });

        if (aliasResponse.status === 404) {
          return res
            .status(404)
            .send({errors: ["No user found for this search term..."]});
        }

        return res.json(aliasResponse.data);
      } catch (aliasError) {
        return res.status(500).send({errors: ["Failed to fetch alias data."]});
      }
    } else {
      return res
        .status(404)
        .send({errors: ["No user found for this search term..."]});
    }
  } catch (error) {
    if (!res.headersSent) {
      if (error.name === "AxiosError" && error.response.status === 404) {
        res
          .status(404)
          .send({errors: ["No user found for this search term..."]});
      } else {
        console.error(error);
        res.status(500).send({errors: ["Internal Server Error"]});
      }
    }
  }
});

export default router;
