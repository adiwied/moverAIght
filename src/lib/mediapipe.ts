import type { PoseLandmarker } from "@mediapipe/tasks-vision"

let landmarker: PoseLandmarker | null = null

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker

  const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  )

  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  })

  return landmarker
}
