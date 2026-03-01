export async function elevenLabsSTT(audioUri: string): Promise<string> {
    const apiKey = process.env.EXPO_PUBLIC_Spot;
  if (!apiKey) throw new Error("Missing Spot key");

  const form = new FormData();

  const file: any = {
    uri: audioUri,
    name: "command.wav",
    type: "audio/wav",
  };

  form.append("file", file);

  // Optional; if ElevenLabs rejects it we’ll remove/adjust
  form.append("model_id", "scribe_v1");

  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      // DO NOT set Content-Type manually
    },
    body: form,
  });

  const raw = await r.text();
  if (!r.ok) throw new Error(`STT failed ${r.status}: ${raw}`);

  const json = JSON.parse(raw);
  return String(json.text ?? "").trim();
}