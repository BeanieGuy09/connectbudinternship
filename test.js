import { HfInference } from "@huggingface/inference";
import "dotenv/config";
import { MongoClient } from "mongodb";

const hf = new HfInference(
  process.env.HF_TOKEN
);

const client = new MongoClient(
  process.env.MONGODB_URI
);
const databases = await client.db().admin().listDatabases();

console.log(
  databases.databases.map(db => db.name)
);

async function embedAllCourses() {
    await client.connect();

    const db = client.db("course-recommender");
    const collections = await db.listCollections().toArray();
    const courses = db.collection("courses");
    console.log(
    collections.map(c => c.name)
    );

    const allCourses = await courses.find({}).toArray();

    console.log(`Found ${allCourses.length} courses`);

    for (const course of allCourses) {
        // Skip already-embedded courses
        //Delete if you want to redo embedding
        if (course.embedding) {
            console.log(`Skipping ${course.title}`);
            continue;
        }
        //Delete (or //) above if you want to redo embedding

        const text = `
            ${course.title ?? ""}
            ${course.description ?? ""}
        `;

        const embedding = await hf.featureExtraction({
            model: "BAAI/bge-small-en-v1.5",
            inputs: text
        });

        await courses.updateOne(
            { _id: course._id },
            {
                $set: {
                    embedding
                }
            }
        );

        console.log(`Embedded: ${course.title}`);
    }

    console.log("Done!");

    await client.close();
}

embedAllCourses().catch(console.error);