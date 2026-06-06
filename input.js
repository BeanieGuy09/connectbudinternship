import { MongoClient } from "mongodb";
import { HfInference } from "@huggingface/inference";
import cosineSimilarity from "compute-cosine-similarity";
import "dotenv/config";

const hf = new HfInference(
  process.env.HF_TOKEN
);

const client = new MongoClient(
  process.env.MONGODB_URI
);
async function recommendCourses(studentText) {
  await client.connect();

  const db = client.db("course-recommender");
  const courses = db.collection("courses");

  const studentEmbedding = await hf.featureExtraction({
    model: "BAAI/bge-small-en-v1.5",
    inputs: studentText
  });

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

  await client.close();

  return scoredCourses.slice(0, 3);
}

// TEST

const recommendations = await recommendCourses(
  "I am a 5th grader interested in computer science and AI."
);

console.log("\nTop Recommendations:\n");

recommendations.forEach((course, index) => {
  console.log(
    `${index + 1}. ${course.title}`
  );
  console.log(
    `Score: ${course.score.toFixed(3)}`
  );
  console.log(
    `${course.description}\n`
  );
});