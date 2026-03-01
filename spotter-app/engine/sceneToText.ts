import type { SceneResult } from "@/services/sense/scene";

type Pos = "left" | "center" | "right";

const FRIENDLY: Record<string, string> = {
  person: "person",
  backpack: "backpack",
  chair: "chair",
  laptop: "laptop",
  cellphone: "phone",
  tv: "TV",
  diningtable: "table",
  couch: "couch",
  trafficlight: "traffic light",
  stopsign: "stop sign",
  firehydrant: "fire hydrant",
};

const IGNORE = new Set<string>([
  // Often noisy / irrelevant for “where am I”
  "hair drier",
  "toothbrush",
  "teddy bear",
  "train",
]);

function prettyLabel(label: string) {
  return FRIENDLY[label] ?? label;
}

// group counts by label and position
function groupDetections(dets: SceneResult["detections"]) {
  const byPos: Record<Pos, Record<string, number>> = {
    left: {},
    center: {},
    right: {},
  };

  for (const d of dets) {
    const label = prettyLabel(d.label);
    if (IGNORE.has(label)) continue;
    byPos[d.pos][label] = (byPos[d.pos][label] ?? 0) + 1;
  }
  return byPos;
}

// helper: make "a person" / "2 people"
function countPhrase(label: string, n: number) {
  // tiny plural rules
  if (n === 1) {
    if (label === "person") return "a person";
    const article = /^[aeiou]/i.test(label) ? "an" : "a";
    return `${article} ${label}`;
  } else {
    if (label === "person") return `${n} people`;
    return `${n} ${label}s`;
  }
}

// pick top K items per position
function topItems(posMap: Record<string, number>, k: number) {
  return Object.entries(posMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);
}

export function sceneToText(scene: SceneResult, opts?: { maxPerSide?: number }) {
  const maxPerSide = opts?.maxPerSide ?? 2;

  // If nothing reliable
  if (!scene.detections || scene.detections.length === 0) {
    return "I don’t see anything clearly. Try panning the camera slowly.";
  }

  const byPos = groupDetections(scene.detections);

  const leftTop = topItems(byPos.left, maxPerSide);
  const centerTop = topItems(byPos.center, maxPerSide);
  const rightTop = topItems(byPos.right, maxPerSide);

  const parts: string[] = [];

  const addPos = (pos: Pos, items: [string, number][]) => {
    if (items.length === 0) return;
    const phrase = items.map(([label, n]) => countPhrase(label, n)).join(" and ");
    if (pos === "center") parts.push(`Ahead, ${phrase}.`);
    if (pos === "left") parts.push(`On your left, ${phrase}.`);
    if (pos === "right") parts.push(`On your right, ${phrase}.`);
  };

  addPos("center", centerTop);
  addPos("left", leftTop);
  addPos("right", rightTop);

  // Fallback if everything got filtered out
  if (parts.length === 0) {
    const labels = Array.from(
      new Set(scene.detections.map((d) => prettyLabel(d.label)))
    ).slice(0, 3);
    return `I see ${labels.join(", ")}.`;
  }

  // Keep it short
  return parts.join(" ");
}