from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import easyocr
import numpy as np
import cv2
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upgraded to YOLOv8 Medium (yolov8m) for better accuracy.
# Make sure to run `pip install ultralytics` to download the model on first run.
model = YOLO("yolov8m.pt")
ocr_reader = easyocr.Reader(["en"], gpu=False)


def bucket_lr(x_center: float, w: int) -> str:
    if x_center < w * 0.33:
        return "left"
    if x_center > w * 0.66:
        return "right"
    return "center"


def sharpen_image(img):
    """Applies a sharpening filter to enhance edges for better OCR."""
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    return cv2.filter2D(img, -1, kernel)


def crop_and_pad(img, bbox, pad_pct=0.10):
    """Crop a bounding box from the image with padding for OCR accuracy."""
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox]
    pw = int((x2 - x1) * pad_pct)
    ph = int((y2 - y1) * pad_pct)
    x1 = max(0, x1 - pw)
    y1 = max(0, y1 - ph)
    x2 = min(w, x2 + pw)
    y2 = min(h, y2 + ph)
    return img[y1:y2, x1:x2]


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/scene/upload")
async def scene_upload(image: UploadFile = File(...), conf: float = 0.35):
    t0 = time.time()

    content = await image.read()
    img_np = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Invalid image"}

    # PREPROCESSING ADDED HERE: Sharpen the full image before YOLO inference
    img = sharpen_image(img)

    h, w = img.shape[:2]
    results = model.predict(img, conf=conf, verbose=False)[0]

    detections = []

    if results.boxes is not None:
        for box, score, cls in zip(
            results.boxes.xyxy.cpu().numpy(),
            results.boxes.conf.cpu().numpy(),
            results.boxes.cls.cpu().numpy(),
        ):
            x1, y1, x2, y2 = box.tolist()
            xc = (x1 + x2) / 2

            detections.append(
                {
                    "label": model.names[int(cls)],
                    "conf": float(score),
                    "pos": bucket_lr(xc, w),
                    "bbox": [x1, y1, x2, y2],
                }
            )

    detections.sort(key=lambda d: d["conf"], reverse=True)

    return {
        "count": len(detections),
        "detections": detections,
        "latency_ms": int((time.time() - t0) * 1000),
    }


# ── Labels that likely contain readable text ──────────────────
TEXT_LABELS = {
    "stop sign",
    "book",
    "clock",
    "laptop",
    "cell phone",
    "tv",
    "traffic light",
    "parking meter",
}


@app.post("/sign/upload")
async def sign_upload(image: UploadFile = File(...), conf: float = 0.30):
    t0 = time.time()

    content = await image.read()
    img_np = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Invalid image"}

    h, w = img.shape[:2]
    results = model.predict(img, conf=conf, verbose=False)[0]

    readings = []

    if results.boxes is not None:
        for box, score, cls in zip(
            results.boxes.xyxy.cpu().numpy(),
            results.boxes.conf.cpu().numpy(),
            results.boxes.cls.cpu().numpy(),
        ):
            x1, y1, x2, y2 = box.tolist()
            label = model.names[int(cls)]
            xc = (x1 + x2) / 2

            crop = crop_and_pad(img, [x1, y1, x2, y2])
            if crop.size == 0:
                continue

            # PREPROCESSING ADDED HERE: Sharpen the cropped image
            sharpened_crop = sharpen_image(crop)

            # Pass the sharpened crop to EasyOCR
            ocr_results = ocr_reader.readtext(sharpened_crop, detail=1, paragraph=False)

            texts = []
            for bbox_pts, text, ocr_conf in ocr_results:
                text = text.strip()
                if text and ocr_conf > 0.25:
                    texts.append({"text": text, "ocr_conf": round(float(ocr_conf), 2)})

            combined_text = " ".join(t["text"] for t in texts) if texts else ""

            readings.append(
                {
                    "label": label,
                    "det_conf": round(float(score), 2),
                    "pos": bucket_lr(xc, w),
                    "bbox": [x1, y1, x2, y2],
                    "has_text": bool(combined_text),
                    "text": combined_text,
                    "fragments": texts,
                }
            )

    readings.sort(key=lambda r: (not r["has_text"], -r["det_conf"]))

    summary_parts = []
    for r in readings:
        if r["has_text"]:
            summary_parts.append(f'{r["label"]} {r["pos"]} says: "{r["text"]}"')

    return {
        "count": len(readings),
        "with_text": sum(1 for r in readings if r["has_text"]),
        "readings": readings,
        "summary": (
            ". ".join(summary_parts) if summary_parts else "No readable text found."
        ),
        "latency_ms": int((time.time() - t0) * 1000),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
