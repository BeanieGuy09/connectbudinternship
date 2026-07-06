import { MongoClient } from "mongodb";
import { HfInference } from "@huggingface/inference";
import cosineSimilarity from "compute-cosine-similarity";
import "dotenv/config";
import readline from "readline";

const hf = new HfInference(process.env.HF_TOKEN);

const client = new MongoClient(process.env.MONGODB_URI);

const messages = [
  {
    role: "system",
    content: `
You are ConnectBud Tutor.

Your job is to:
- Teach students.
- Answer educational questions.
- Explain concepts clearly.
- Adapt explanations to the student's age.
- Encourage learning.
- Ask follow-up questions when helpful.

You are not a general-purpose assistant.
Focus on education and learning. If straying from educational topics, insist on focusing.

Never mention embeddings, vector search, databases, or internal tools.
`
  }
];
function isTutorRequest(text) {
  const lower = text.toLowerCase();

  return (
    lower.includes("tutor") ||
    lower.includes("teacher") ||
    lower.includes("mentor") ||
    lower.includes("find a tutor") ||
    lower.includes("looking for a tutor") ||
    lower.includes("find someone")
  );
}
function isRecommendationRequest(text) {
  const lower = text.toLowerCase();

  return (
    lower.includes("recommend") ||
    lower.includes("course") ||
    lower.includes("class") ||
    lower.includes("classes") ||
    lower.includes("what should i learn") ||
    lower.includes("what should i take")
  );
}

async function recommendCourses(studentText) {
  const db = client.db("course-recommender");
  const courses = db.collection("courses");

  //console.log("\nBuilding student profile...");

  const recentMessages = messages
    .filter(m => m.role === "user")
    .slice(-12)
    .map(m => m.content)
    .join("\n");

  const profileResponse = await hf.chatCompletion({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content: `
Extract the student's interests, goals, hobbies,
favorite subjects, and skills they want to learn.

Return a concise profile in plain English.
`
      },
      {
        role: "user",
        content: recentMessages
      }
    ],
    max_tokens: 200
  });

  const profile =
    profileResponse.choices?.[0]?.message?.content ??
    "";

  //console.log("\nStudent Profile:");
  //console.log(profile);

  //console.log("\nFinding matching courses...");

  const embeddingInput = `
Student Profile:
${profile}
Current Request:
${studentText}
${studentText}
${studentText}
${studentText}
${studentText}
`;

  const studentEmbedding = await hf.featureExtraction({
    model: "BAAI/bge-small-en-v1.5",
    inputs: embeddingInput
  });

  const allCourses = await courses.find({}).toArray();
  console.log(
    `Loaded ${allCourses.length} courses`
  );
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
  if (topCourses.length === 0) {
    return "No courses have embeddings yet. Run test.js first.";
  }
  //console.log("\nTop 10 Matches:");

  //topCourses.forEach((course, index) => {
  //  console.log(
  //    `${index + 1}. ${course.title} (${course.score.toFixed(3)})`
  //   );
  //});

console.log(profile)
  const prompt = `
You are an experienced educational advisor.

Student Profile:
${profile}
Current Request:
${studentText}

Available Courses:
${topCourses
  .map(
    course =>
      `- ${course.title}: ${course.description}`
  )
  .join("\n")}

Recommend exactly 3 courses.

Guidelines:
- Consider the student's age and interests.
- Explain why each course is a good fit.
- Choose a variety of courses when appropriate.
- Speak directly to the student.
- Be friendly and conversational.
- Do not mention rankings, scores, embeddings, or candidate lists.
`;
  
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

  return (
    response.choices?.[0]?.message?.content ??
    "Sorry, I couldn't generate recommendations."
  );
}

async function recommendTutors(studentText) {
  const db = client.db("tutor-recommender");
  const tutors = db.collection("tutors");

  const recentMessages = messages
    .filter(m => m.role === "user")
    .slice(-12)
    .map(m => m.content)
    .join("\n");

  const profileResponse = await hf.chatCompletion({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content: `
Extract:

- subjects student needs help with
- grade level
- learning goals
- preferred tutor characteristics
- preferred teaching style

Return a concise profile.
`
      },
      {
        role: "user",
        content: recentMessages + "\n" + studentText
      }
    ],
    max_tokens: 200
  });

  const profile =
    profileResponse.choices?.[0]?.message?.content ?? "";

  console.log("\nStudent Profile:");
  console.log(profile);

  const studentEmbedding = await hf.featureExtraction({
    model: "BAAI/bge-small-en-v1.5",
    inputs: `
Student Profile:
${profile}

Current Request:
${studentText}
`
  });

  const allTutors = await tutors.find({}).toArray();
  console.log(
    `Loaded ${allTutors.length} tutors`
  );
  const scoredTutors = [];

  for (const tutor of allTutors) {
    if (!tutor.embedding) continue;

    const score = cosineSimilarity(
      studentEmbedding,
      tutor.embedding
    );

    scoredTutors.push({
      tutor,
      score
    });
  }

  scoredTutors.sort((a, b) => b.score - a.score);

  const topTutors = scoredTutors.slice(0, 10);
  if (topTutors.length === 0) {
    return "No tutors have embeddings yet. Run tutorMatcher.js first.";
  }
  const prompt = `
You are an experienced educational advisor.

Student Profile:
${profile}

Current Request:
${studentText}

Available Tutors:

${topTutors.map(({ tutor }) => `
Name: ${tutor.name ?? ""}

Subjects:
${(tutor.subjects || []).join(", ")}

Teaching Style:
${tutor.teachingStyle ?? ""}

Experience:
${tutor.experience ?? ""}

Bio:
${tutor.bio ?? ""}

Location:
${tutor.location ?? ""}

Gender:
${tutor.gender ?? ""}

Online:
${tutor.online ? "Yes" : "No"}
`).join("\n----------------\n")}

Recommend exactly 3 tutors.

For each tutor:
- Explain why they fit the student.
- Mention relevant subjects.
- Mention experience.
- Mention teaching style.

Do not mention:
- embeddings
- scores
- rankings
- vector search
`;

  const response = await hf.chatCompletion({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 600
  });

  return (
    response.choices?.[0]?.message?.content ??
    "Sorry, I couldn't find tutors."
  );
}

async function tutorResponse(userInput) {
  const response = await hf.chatCompletion({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages,
    max_tokens: 500
  });

  const reply =
    response.choices?.[0]?.message?.content ??
    "Sorry, I couldn't answer that.";

  return reply;
}

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