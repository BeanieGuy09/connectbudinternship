import { HfInference } from "@huggingface/inference";
import "dotenv/config";
import { MongoClient } from "mongodb";

const hf = new HfInference(
  process.env.HF_TOKEN
);

const client = new MongoClient(
  process.env.MONGODB_URI
);

async function embedAllTutors() {
  await client.connect();

  const db =
    client.db("tutor-recommender");

  const tutors =
    db.collection("tutors");

  const allTutors =
    await tutors.find({}).toArray();

  console.log(
    `Found ${allTutors.length} tutors`
  );

  for (const tutor of allTutors) {
    const text = `
Name:
${tutor.name ?? ""}

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
`;

    const embedding =
      await hf.featureExtraction({
        model:
          "BAAI/bge-small-en-v1.5",
        inputs: text
      });

    await tutors.updateOne(
      { _id: tutor._id },
      {
        $set: {
          embedding
        }
      }
    );

    console.log(
      `Embedded: ${tutor.name}`
    );
  }

  console.log("Done!");

  await client.close();
}

embedAllTutors().catch(
  console.error
);