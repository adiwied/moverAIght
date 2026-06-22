import type { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

export type ModelSize = "lite" | "full" | "heavy"

export const MODEL_LABELS: Record<ModelSize, string> = {
  lite: "Lite",
  full: "Full",
  heavy: "Heavy",
}

const MODEL_URLS: Record<ModelSize, string> = {
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  heavy: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
}

const cache: Partial<Record<ModelSize, PoseLandmarker>> = {}
let visionPromise: Promise<WasmFileset> | null = null

async function getVision(): Promise<WasmFileset> {
  if (!visionPromise) {
    const { FilesetResolver } = await import("@mediapipe/tasks-vision")
    visionPromise = FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
    )
  }
  return visionPromise
}

export async function getPoseLandmarker(model: ModelSize = "full"): Promise<PoseLandmarker> {
  if (cache[model]) return cache[model]!

  const { PoseLandmarker } = await import("@mediapipe/tasks-vision")
  const vision = await getVision()

  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URLS[model],
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  })

  cache[model] = landmarker
  return landmarker
}
