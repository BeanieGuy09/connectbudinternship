import express from "express";
import cors from "cors";

import {
  client,
  messages,
  isTutorRequest,
  isRecommendationRequest,
  recommendCourses,
  recommendTutors,
  tutorResponse
} from "./ai.js";

const app = express();

app.use(cors());
app.use(express.json());

await client.connect();

app.post("/chat", async (req, res) => {
  try {
    const input = req.body.message;

    if (!input) {
      return res.status(400).json({
        error: "No message provided."
      });
    }

    messages.push({
      role: "user",
      content: input
    });

    let response;

    if (isTutorRequest(input)) {
      response = await recommendTutors(input);
    } else if (isRecommendationRequest(input)) {
      response = await recommendCourses(input);
    } else {
      response = await tutorResponse(input);
    }

    messages.push({
      role: "assistant",
      content: response
    });

    res.json({
      reply: response
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Internal server error."
    });
  }
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});