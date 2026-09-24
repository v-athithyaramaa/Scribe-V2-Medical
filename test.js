import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from 'fs';

async function test() {
  const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  console.log("Client created");
  try {
    // just check model options or try a dummy request
    // we don't have a real file, but we can catch the specific error
    const result = await client.speechToText.convert({
      file: fs.createReadStream("package.json"), // dummy file
      model_id: "scribe_v2_medical",
    });
    console.log(result);
  } catch (err) {
    console.error("API error:", err.message);
  }
}

test();
