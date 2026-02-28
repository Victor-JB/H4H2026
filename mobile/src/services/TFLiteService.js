/**
 * TFLiteService.js
 *
 * Loads a TensorFlow Lite object detection model and runs inference on
 * preprocessed image frames. Returns detection results (label, confidence, bbox).
 *
 * The native module is loaded dynamically so the app can run without it
 * (e.g. in Expo Go or before a dev build). When the module is missing,
 * loadModel returns null and runInference returns [].
 */

let loadTensorflowModel = null;
let nativeModuleChecked = false;
let nativeModuleAvailable = false;

function getTFLiteLoader() {
  if (nativeModuleChecked) {
    return nativeModuleAvailable ? loadTensorflowModel : null;
  }
  nativeModuleChecked = true;
  try {
    const tflite = require('react-native-fast-tflite');
    loadTensorflowModel = tflite.loadTensorflowModel;
    nativeModuleAvailable = true;
    return loadTensorflowModel;
  } catch (err) {
    console.warn(
      '[TFLiteService] Native TFLite module not available. Run a dev build (expo run:android / expo run:ios) for object detection.',
      err?.message ?? err,
    );
    return null;
  }
}

// COCO dataset labels (80 classes, 0-indexed for models that output 0=background, 1=person, ...)
const COCO_LABELS = [
  'person', 'bicycle', 'car', 'motorbike', 'aeroplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
  'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
  'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
  'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'sofa', 'potted plant', 'bed',
  'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

/** SSD MobileNet V1 typical input size. */
export const DEFAULT_INPUT_SIZE = 300;

let modelInstance = null;
let modelLoadPromise = null;

/**
 * Loads the TFLite model. Uses CPU inference (no delegate) for stability with Expo.
 *
 * @param {{ url?: string } | number} [modelSource] - { url: string } for remote, or require() for asset
 * @returns {Promise<object|null>} The loaded model or null on failure
 */
export async function loadModel(modelSource) {
  if (modelInstance) return modelInstance;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    const loader = getTFLiteLoader();
    if (!loader) return null;
    try {
      let source = modelSource;
      if (!source) {
        // Use bundled asset if available, else remote
        try {
          source = require('../../assets/models/ssd_mobilenet.tflite');
        } catch {
          source = {
            url: 'https://raw.githubusercontent.com/google-coral/test_data/master/ssd_mobilenet_v1_coco_quant_postprocess.tflite',
          };
        }
      }
      modelInstance = await loader(source);
      return modelInstance;
    } catch (err) {
      console.warn('[TFLiteService] Failed to load model:', err);
      modelLoadPromise = null;
      return null;
    }
  })();

  return modelLoadPromise;
}

/** Flatten tensor to 1D for uniform access (handles [N], [1,N], [1,N,4]) */
function flattenTensor(t) {
  if (!t) return [];
  if (Array.isArray(t)) return t.flat(Infinity);
  if (t instanceof Float32Array || t instanceof Uint8Array) return Array.from(t);
  return [];
}

/** Simplified parser for different SSD output layouts (Float32Array, 2D, etc.) */
function parseOutputsRobust(outputs, threshold = 0.5) {
  const results = [];
  if (!outputs || outputs.length < 3) return results;

  const boxesFlat = flattenTensor(outputs[0]);
  const classesFlat = flattenTensor(outputs[1]);
  const scoresFlat = flattenTensor(outputs[2]);

  if (scoresFlat.length === 0) return results;

  const numBoxes = Math.min(scoresFlat.length, 10);

  for (let i = 0; i < numBoxes; i++) {
    const conf = scoresFlat[i];
    if (typeof conf !== 'number' || conf < threshold) continue;

    const classIdx = Math.round(classesFlat[i] ?? 0);
    const label = classIdx > 0 && classIdx <= COCO_LABELS.length
      ? COCO_LABELS[classIdx - 1]
      : `class_${classIdx}`;

    const boxBase = i * 4;
    const bbox = [
      boxesFlat[boxBase] ?? 0,
      boxesFlat[boxBase + 1] ?? 0,
      boxesFlat[boxBase + 2] ?? 0,
      boxesFlat[boxBase + 3] ?? 0,
    ];

    results.push({ label, confidence: conf, bbox });
  }

  return results;
}

/**
 * Runs object detection on a preprocessed RGB frame.
 *
 * @param {Uint8Array} preprocessedFrame - RGB tensor [H*W*3], e.g. 300x300x3
 * @param {number} [confidenceThreshold] - Minimum confidence (default 0.5)
 * @returns {Promise<Array<{ label: string, confidence: number, bbox: number[] }>>}
 */
export async function runInference(preprocessedFrame, confidenceThreshold = 0.5) {
  const model = await loadModel();
  if (!model) return [];

  try {
    const outputs = model.runSync([preprocessedFrame]);
    return parseOutputsRobust(outputs, confidenceThreshold);
  } catch (err) {
    console.warn('[TFLiteService] Inference error:', err);
    return [];
  }
}
