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

// Creates a fresh uncached VIDEO mode instance for each video processing run.
// Avoids timestamp conflicts with the live camera's cached instance, which uses
// performance.now() and can be far ahead of a video starting at t=0.
export async function createVideoLandmarker(model: ModelSize): Promise<PoseLandmarker> {
  const { PoseLandmarker } = await import("@mediapipe/tasks-vision")
  const vision = await getVision()
  const options = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URLS[model], delegate },
      runningMode: "VIDEO",
      numPoses: 1,
    })
  return options("GPU").catch(() => options("CPU"))
}

export async function getPoseLandmarker(model: ModelSize = "full"): Promise<PoseLandmarker> {
  if (cache[model]) return cache[model]!

  const { PoseLandmarker } = await import("@mediapipe/tasks-vision")
  const vision = await getVision()

  const options = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URLS[model], delegate },
      runningMode: "VIDEO",
      numPoses: 1,
    })

  // GPU can fail silently on some mobile browsers — fall back to CPU
  const landmarker = await options("GPU").catch(() => options("CPU"))

  cache[model] = landmarker
  return landmarker
}
