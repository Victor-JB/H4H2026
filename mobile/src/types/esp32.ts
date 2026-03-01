export type StreamingMode = 'snapshot' | 'mjpeg';
export type AiVerbosity = 'low' | 'medium' | 'high';
export type FrameQuality = 'low' | 'medium' | 'high';

export interface Esp32Config {
  ip: string;
  port: number;
  streamingMode: StreamingMode;
  snapshotInterval: number;
  aiEnabled: boolean;
  aiVerbosity: AiVerbosity;
  targetLatency: number;
  maxLatency: number;
  frameQuality: FrameQuality;
  enableObjectDetection: boolean;
  enableAudioAlerts: boolean;
  sceneDescription: boolean;
  obstacleAvoidance: boolean;
  signReading: boolean;
  bufferSize?: number;
  retryAttempts?: number;
  timeout?: number;
}

export type Esp32ConfigUpdate = Partial<Esp32Config>;
