/**
 * ESP32 Configuration Service
 * 
 * Service for managing ESP32 camera streaming server configuration.
 */

export const ESP32_DEFAULTS = {
  ip: '192.168.43.184',
  port: 80,
  streamingMode: 'snapshot' as 'snapshot' | 'mjpeg',
  snapshotInterval: 100,
  // AI and processing settings
  aiEnabled: true,
  aiVerbosity: 'medium' as 'low' | 'medium' | 'high',
  // Latency settings
  targetLatency: 200, // milliseconds
  maxLatency: 500, // milliseconds
  // Performance settings
  frameQuality: 'medium' as 'low' | 'medium' | 'high',
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

export type Esp32Config = typeof ESP32_DEFAULTS;

export function getStreamUrl(config: Esp32Config): string {
  const { ip, port, streamingMode } = config;
  const baseUrl = `http://${ip}:${port}`;
  
  if (streamingMode === 'mjpeg') {
    return `${baseUrl}/stream`;
  } else {
    return `${baseUrl}/snapshot`;
  }
}

export function getTestUrl(config: Pick<Esp32Config, 'ip' | 'port'>): string {
  const { ip, port } = config;
  return `http://${ip}:${port}/test`;
}

