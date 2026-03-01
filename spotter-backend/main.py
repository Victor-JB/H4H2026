from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2
import time

app = FastAPI()

# Allow phone → backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO once
model = YOLO("yolov8n.pt")


def bucket_lr(x_center: float, w: int) -> str:
    if x_center < w * 0.33:
        return "left"
    if x_center > w * 0.66:
        return "right"
    return "center"


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

            detections.append({
                "label": model.names[int(cls)],
                "conf": float(score),
                "pos": bucket_lr(xc, w),
                "bbox": [x1, y1, x2, y2],
            })

    detections.sort(key=lambda d: d["conf"], reverse=True)

    return {
        "count": len(detections),
        "detections": detections,
        "latency_ms": int((time.time() - t0) * 1000),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
