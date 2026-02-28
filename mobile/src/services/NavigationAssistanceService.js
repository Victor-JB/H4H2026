/**
 * NavigationAssistanceService.js
 *
 * Maps TFLite detection results to navigation-relevant audio alerts.
 * Debounces alerts to avoid chatter and speaks via SpeechService.
 */

import { speakAlert } from './SpeechService';

/** Minimum milliseconds between spoken alerts. */
const MIN_ALERT_INTERVAL_MS = 2000;

/** Navigation-relevant label mappings. Keys are lowercase COCO labels. */
const LABEL_TO_ALERT = {
  person: 'Person ahead',
  bicycle: 'Bicycle in path',
  car: 'Vehicle nearby',
  motorbike: 'Vehicle nearby',
  bus: 'Vehicle nearby',
  train: 'Train or large vehicle',
  truck: 'Vehicle nearby',
  boat: 'Water hazard',
  traffic_light: 'Traffic light',
  fire_hydrant: 'Obstacle ahead',
  stop_sign: 'Stop sign',
  bench: 'Obstacle ahead',
  chair: 'Obstacle ahead',
  sofa: 'Obstacle ahead',
  potted_plant: 'Obstacle ahead',
  bed: 'Obstacle ahead',
  dining_table: 'Obstacle ahead',
  toilet: 'Obstacle ahead',
  tv: 'Obstacle ahead',
  laptop: 'Obstacle ahead',
  cell_phone: 'Obstacle ahead',
  microwave: 'Obstacle ahead',
  oven: 'Obstacle ahead',
  toaster: 'Obstacle ahead',
  sink: 'Obstacle ahead',
  refrigerator: 'Obstacle ahead',
  book: 'Obstacle ahead',
  clock: 'Obstacle ahead',
  vase: 'Obstacle ahead',
};

let lastAlertTime = 0;

/**
 * Returns the highest-priority alert message for a set of detections.
 * Prioritizes: person > vehicles > obstacles > other.
 *
 * @param {Array<{ label: string, confidence: number }>} detections
 * @returns {string|null} Alert text or null if nothing to say
 */
function getAlertForDetections(detections) {
  if (!detections || detections.length === 0) return null;

  const priorityOrder = ['person', 'car', 'motorbike', 'bus', 'truck', 'bicycle', 'train', 'boat'];
  for (const label of priorityOrder) {
    const match = detections.find(
      (d) => d.label && d.label.toLowerCase().replace(/\s/g, '_') === label,
    );
    if (match) {
      return LABEL_TO_ALERT[label] ?? `${match.label} ahead`;
    }
  }

  for (const d of detections) {
    const key = d.label?.toLowerCase().replace(/\s/g, '_');
    if (LABEL_TO_ALERT[key]) {
      return LABEL_TO_ALERT[key];
    }
  }

  const top = detections[0];
  return top ? `${top.label} ahead` : null;
}

/**
 * Processes detections and speaks a navigation alert if warranted.
 * Debounces to avoid rapid-fire speech.
 *
 * @param {Array<{ label: string, confidence: number, bbox?: number[] }>} detections
 */
export function processDetectionsForNavigation(detections) {
  const message = getAlertForDetections(detections);
  if (!message) return;

  const now = Date.now();
  if (now - lastAlertTime < MIN_ALERT_INTERVAL_MS) return;

  lastAlertTime = now;
  speakAlert(message);
}

/**
 * Resets the debounce timer (call when starting a new session).
 */
export function resetAlertDebounce() {
  lastAlertTime = 0;
}
