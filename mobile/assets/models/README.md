# TFLite Model Assets

Place your TFLite object detection model here. For example:

- **SSD MobileNet V1 (COCO)**: Download from [TensorFlow Hub](https://tfhub.dev/google/lite-model/ssd_mobilenet_v1/1/default/1) or use the quantized model from the [TensorFlow Lite object detection guide](https://www.tensorflow.org/lite/examples/object_detection/overview).

- **Direct download** (quantized SSD MobileNet for COCO):
  ```bash
  curl -L -o detect.tflite "https://storage.googleapis.com/download.tensorflow.org/models/tflite/coco_ssd_mobilenet_v1_1.0_quant_2018_06_29.zip"
  # Extract detect.tflite from the zip and place it here as ssd_mobilenet.tflite
  ```

The app can also load models from a remote URL at runtime (see TFLiteService.js).
