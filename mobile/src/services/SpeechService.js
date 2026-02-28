/**
 * SpeechService.js
 *
 * Provides two audio output capabilities:
 *
 *   1. Low-latency navigation alerts via the built-in Expo Speech API.
 *      Use `speakAlert()` for immediate, short navigational cues such as
 *      "Obstacle ahead" or "Turn left in 2 metres".
 *
 *   2. Descriptive scene narration via the ElevenLabs text-to-speech API.
 *      Use `narrateScene()` for richer, AI-generated scene descriptions.
 *      Replace ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID with real values
 *      from your ElevenLabs dashboard before deploying.
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// ---------------------------------------------------------------------------
// ElevenLabs configuration — replace with real values via environment config
// ---------------------------------------------------------------------------
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? 'YOUR_ELEVENLABS_API_KEY';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL'; // "Sarah"
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// ---------------------------------------------------------------------------
// 1. Low-latency Expo Speech alerts
// ---------------------------------------------------------------------------

/**
 * Speaks a short navigation alert immediately, interrupting any in-progress
 * speech from previous calls.
 *
 * @param {string} text    - The alert text to speak.
 * @param {object} options - Optional expo-speech options (language, pitch, rate).
 */
export function speakAlert(text, options = {}) {
  // Stop any ongoing speech first for lowest latency
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    pitch: 1.0,
    rate: 1.1,
    ...options,
  });
}

/**
 * Stops any currently active speech.
 */
export function stopSpeech() {
  Speech.stop();
}

/**
 * Returns a promise that resolves to `true` if the Speech API is available
 * on this device.
 *
 * @returns {Promise<boolean>}
 */
export async function isSpeechAvailable() {
  return Speech.isAvailableAsync();
}

// ---------------------------------------------------------------------------
// 2. ElevenLabs scene narration (higher-latency, richer descriptions)
// ---------------------------------------------------------------------------

/** Shared Audio.Sound instance so we can stop/replace playback cleanly. */
let _narrationSound = null;

/**
 * Sends `sceneDescription` to the ElevenLabs TTS API and plays the returned
 * audio. Stops any previously playing narration before starting a new one.
 *
 * @param {string} sceneDescription - Natural-language description of the scene.
 * @param {object} voiceSettings    - Optional ElevenLabs voice settings override.
 * @returns {Promise<void>}
 */
export async function narrateScene(sceneDescription, voiceSettings = {}) {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'YOUR_ELEVENLABS_API_KEY') {
    // Fall back to Expo Speech when no API key is configured
    speakAlert(sceneDescription);
    return;
  }

  try {
    await stopNarration();

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: sceneDescription,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            ...voiceSettings,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // ElevenLabs returns raw MP3 bytes — write to a temp file and play via expo-av.
    // URL.createObjectURL is a browser-only API and is not available in React Native.
    const audioBytes = await response.arrayBuffer();
    const uint8 = new Uint8Array(audioBytes);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Audio = btoa(binary);
    const tmpUri = `${FileSystem.cacheDirectory}narration_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tmpUri, base64Audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { sound } = await Audio.Sound.createAsync({ uri: tmpUri });
    _narrationSound = sound;
    await sound.playAsync();
  } catch (err) {
    console.warn('[SpeechService] narrateScene error, falling back to expo-speech:', err);
    speakAlert(sceneDescription);
  }
}

/**
 * Stops any currently playing ElevenLabs narration and releases resources.
 *
 * @returns {Promise<void>}
 */
export async function stopNarration() {
  if (_narrationSound) {
    try {
      await _narrationSound.stopAsync();
      await _narrationSound.unloadAsync();
    } catch {
      // Ignore errors on stop/unload
    }
    _narrationSound = null;
  }
}
