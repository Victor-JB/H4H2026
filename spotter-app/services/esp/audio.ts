export async function fetchEspAudioBlob(espBaseUrl: string): Promise<Blob> {
  // Append a cache-busting query so repeated downloads don't get a stale file
  const url = `${espBaseUrl}/audio.wav?cb=${Date.now()}`;

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch audio from ESP32. Status: ${response.status}`);
  }

  // Read the response directly into device memory as a Blob
  const audioBlob = await response.blob();
  return audioBlob;
}