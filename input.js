import { MongoClient } from "mongodb";
import { HfInference } from "@huggingface/inference";
import cosineSimilarity from "compute-cosine-similarity";
import "dotenv/config";

const hf = new HfInference(process.env.HF_TOKEN);

const client = new MongoClient(process.env.MONGODB_URI);

async function recommendCourses(studentText) {
  try {
    await client.connect();

    const db = client.db("course-recommender");
    const courses = db.collection("courses");

    console.log("Creating student embedding...");

    const studentEmbedding = await hf.featureExtraction({
      model: "BAAI/bge-small-en-v1.5",
      inputs: studentText
    });

    console.log("Embedding created.");

    const allCourses = await courses.find({}).toArray();

    console.log(`Found ${allCourses.length} courses`);

    const scoredCourses = [];

    for (const course of allCourses) {
      if (!course.embedding) continue;

      const score = cosineSimilarity(
        studentEmbedding,
        course.embedding
      );

      scoredCourses.push({
        title: course.title,
        description: course.description,
        score
      });
    }

    scoredCourses.sort((a, b) => b.score - a.score);

    const topCourses = scoredCourses.slice(0, 10);

    console.log("\nTop 10 courses:");
    console.log(topCourses);

    const prompt = `
You are an educational advisor.

Student:
${studentText}

Candidate Courses:
${topCourses
  .map(
    course =>
      `- ${course.title}: ${course.description}`
  )
  .join("\n")}

Task:
Recommend exactly 3 courses.

Requirements:
- Pick the courses that best match the student's interests.
- Try to provide variety when possible.
- Explain why each course is a good fit.
- Speak directly to the student.
- Be friendly and encouraging.
`;

    console.log("\nSending prompt to LLM...\n");

    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500
    });

    console.log("\nRAW RESPONSE:");
    console.log(JSON.stringify(response, null, 2));

    await client.close();

    return response.choices?.[0]?.message?.content ??
      "No response returned from model.";
  } catch (err) {
    console.error("\nERROR:");
    console.error(err);

    try {
      await client.close();
    } catch {}

    return "Something went wrong.";
  }
}

// TEST

const result = await recommendCourses(
  "I am a 5th grader interested in computer science, AI, robotics, and building cool things."
);

console.log("\nFINAL OUTPUT:\n");
console.log(result);