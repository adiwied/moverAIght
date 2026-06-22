import type { NormalizedLandmark } from "@mediapipe/tasks-vision"

export function calculateAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

export function isVisible(landmark: NormalizedLandmark, threshold = 0.5): boolean {
  return (landmark.visibility ?? 1) >= threshold
}

export function allVisible(landmarks: NormalizedLandmark[], indices: number[]): boolean {
  return indices.every((i) => isVisible(landmarks[i]))
}
