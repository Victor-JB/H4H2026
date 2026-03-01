export type Intent = "SCENE" | "OBSTACLE" | "SIGN" | "FIND" | "UNKNOWN";

export function inferIntent(transcript: string): { intent: Intent; target?: string } {
  const s = transcript.toLowerCase();

  if (s.includes("where am i") || s.includes("describe") || s.includes("what's around") || s.includes("what is around")) {
    return { intent: "SCENE" };
  }
  if (s.includes("avoid") || s.includes("obstacle") || s.includes("in my way") || s.includes("clear path")) {
    return { intent: "OBSTACLE" };
  }
  if (s.includes("read") || s.includes("sign") || s.includes("what does this say")) {
    return { intent: "SIGN" };
  }

  // "where is my backpack" / "find my keys"
  const m1 = s.match(/where is my (.+)/);
  if (m1?.[1]) return { intent: "FIND", target: m1[1].trim() };

  const m2 = s.match(/find my (.+)/);
  if (m2?.[1]) return { intent: "FIND", target: m2[1].trim() };

  return { intent: "UNKNOWN" };
}