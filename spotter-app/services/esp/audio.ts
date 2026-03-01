export async function fetchEspAudioBlob(espBaseUrl: string): Promise<Blob> {
  // Append a cache-busting query so repeated downloads don't get a stale file
  const url = `${espBaseUrl}/audio.wav?cb=${Date.now()}`;

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch audio from ESP32. Status: ${response.status}`);
  }

  // Read the response directly into device memory as a Blob
  const audioBlob = await response.blob();
  inspectBlob(audioBlob);
  return audioBlob;
}

export function inspectBlob(blob: Blob, label = 'AudioBlob'): void {
  console.log(`[${label}] size: ${blob.size} bytes, type: "${blob.type}"`);

  // Read first 44 bytes (WAV header) to verify format
  const reader = new FileReader();
  reader.onloadend = () => {
    if (reader.result instanceof ArrayBuffer) {
      const arr = new Uint8Array(reader.result);
      const header = Array.from(arr.slice(0, 44));

      // Bytes 0-3 should be "RIFF" (82, 73, 70, 70)
      const riff = String.fromCharCode(...header.slice(0, 4));
      // Bytes 8-11 should be "WAVE" (87, 65, 86, 69)
      const wave = String.fromCharCode(...header.slice(8, 12));
      // Bytes 22-23: number of channels (little-endian)
      const channels = header[22] | (header[23] << 8);
      // Bytes 24-27: sample rate (little-endian)
      const sampleRate = header[24] | (header[25] << 8) | (header[26] << 16) | (header[27] << 24);
      // Bytes 34-35: bits per sample
      const bitsPerSample = header[34] | (header[35] << 8);

      console.log(`[${label}] Header: ${riff}/${wave}`);
      console.log(`[${label}] Channels: ${channels}, SampleRate: ${sampleRate}, Bits: ${bitsPerSample}`);
      console.log(`[${label}] First 12 raw bytes: [${header.slice(0, 12).join(', ')}]`);

      if (riff !== 'RIFF' || wave !== 'WAVE') {
        console.warn(`[${label}] ⚠️ NOT a valid WAV file!`);
      }
    }
  };
  reader.readAsArrayBuffer(blob.slice(0, 44));
}