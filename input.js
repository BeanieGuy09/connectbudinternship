import { MongoClient } from "mongodb";
import { HfInference } from "@huggingface/inference";
import cosineSimilarity from "compute-cosine-similarity";
import "dotenv/config";
import readline from "readline";

const hf = new HfInference(process.env.HF_TOKEN);

const client = new MongoClient(process.env.MONGODB_URI);

async function recommendCourses(studentText) {
  const db = client.db("course-recommender");
  const courses = db.collection("courses");

  console.log("\nCreating student embedding...");

  const studentEmbedding = await hf.featureExtraction({
    model: "BAAI/bge-small-en-v1.5",
    inputs: studentText
  });

  console.log("Embedding created.");

  const allCourses = await courses.find({}).toArray();

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

  console.log("\nTop 10 Matches:");

  topCourses.forEach((course, index) => {
    console.log(
      `${index + 1}. ${course.title} (${course.score.toFixed(3)})`
    );
  });

  const prompt = `
You are an educational advisor.

Student Profile:
${studentText}

Candidate Courses:
${topCourses
  .map(
    course =>
      `- ${course.title}: ${course.description}`
  )
  .join("\n")}

Recommend exactly 3 courses.

Rules:
- Pick the best 3 courses.
- Try to provide variety when possible.
- Explain why each course matches the student's interests.
- Speak directly to the student.
- Be friendly and encouraging.
`;

  console.log("\nGenerating recommendation...\n");

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

  return response.choices?.[0]?.message?.content ??
    "Sorry, I couldn't generate a recommendation.";
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

await client.connect();

rl.question(
  "Tell me about yourself and your interests:\n> ",
  async (answer) => {
    try {
      const recommendation = await recommendCourses(
        answer
      );

      console.log("\n========================");
      console.log("COURSE RECOMMENDATIONS");
      console.log("========================\n");

      console.log(recommendation);
    } catch (err) {
      console.error(err);
    } finally {
      await client.close();
      rl.close();
    }
  }
);