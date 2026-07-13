
import readline from "readline";

import {
  client,
  messages,
  isTutorRequest,
  isRecommendationRequest,
  recommendCourses,
  recommendTutors,
  tutorResponse
} from "./ai.js";


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

await client.connect();

console.log("ConnectBud Tutor Started!");
console.log("Type 'exit' to quit.\n");

function askQuestion() {
  rl.question("You > ", async (input) => {
    try {
      if (input.toLowerCase() === "exit") {
        await client.close();
        rl.close();
        return;
      }

      let response;
      messages.push({
        role: "user",
        content: input
      });

      if (isTutorRequest(input)) {
        response = await recommendTutors(input);
      
      } else if (isRecommendationRequest(input)) {
        response = await recommendCourses(input);

      } else {
        response = await tutorResponse(input);
      }

      console.log("\nTutor >");
      console.log(response);
      console.log("");
      messages.push({
        role: "assistant",
        content: response
      });
      askQuestion();
    } catch (err) {
      console.error(err);
      askQuestion();
    }
  });
}

askQuestion();