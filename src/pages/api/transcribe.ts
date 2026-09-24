import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY is not configured.' }), { status: 500 });
  }

  const client = new ElevenLabsClient({ apiKey });
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No valid audio file provided' }), { status: 400 });
    }
    
    // Convert Web File to buffer and save to a temporary path
    const buffer = await file.arrayBuffer();
    // Keep the file extension if available
    const ext = file.name ? path.extname(file.name) : '.webm';
    const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}${ext}`);
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));
    
    // Call ElevenLabs Speech-to-Text API
    // According to docs, scribe_v2_medical is the model ID for medical domain
    const result = await client.speechToText.convert({
      file: fs.createReadStream(tempFilePath),
      modelId: "scribe_v2_medical",
    });

    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.error("Failed to delete temp file:", e);
    }

    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error("Transcription error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Transcription failed' }), { status: 500 });
  }
};
