/**
 * ESP32Service.js
 * 
 * Service for communicating with the ESP32 camera streaming server.
 */

export const ESP32_DEFAULTS = {
  ip: '192.168.43.184',
  port: 80,
  streamingMode: 'snapshot', // 'snapshot' or 'mjpeg'
  snapshotInterval: 100,
  // AI and processing settings
  aiEnabled: true,
  aiVerbosity: 'medium', // 'low', 'medium', 'high'
  // Latency settings
  targetLatency: 200, // milliseconds
  maxLatency: 500, // milliseconds
  // Performance settings
  frameQuality: 'medium', // 'low', 'medium', 'high'
  enableObjectDetection: true,
  enableAudioAlerts: true,
  sceneDescription: true,
  obstacleAvoidance: true,
  signReading: true,
  // Advanced settings
  bufferSize: 3, // number of frames to buffer
  retryAttempts: 3,
  timeout: 5000, // milliseconds
};

export function getStreamUrl(config) {
  const { ip, port, streamingMode } = config;
  const baseUrl = `http://${ip}:${port}`;
  
  if (streamingMode === 'mjpeg') {
    return `${baseUrl}/stream`;
  } else {
    return `${baseUrl}/snapshot`;
  }
}

export function getTestUrl(config) {
  const { ip, port } = config;
  return `http://${ip}:${port}/test`;
}

