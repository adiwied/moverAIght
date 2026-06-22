import type { NormalizedLandmark } from "@mediapipe/tasks-vision"
import type { ExerciseType } from "@/types"
import type { RepState } from "@/utils/exerciseAnalyzer"
import { analyzeFrame } from "@/utils/exerciseAnalyzer"
import { createVideoLandmarker, type ModelSize } from "@/lib/mediapipe"

export interface FrameResult {
  timeMs: number
  frameIndex: number
  score: number
  feedback: string
  primaryAngle: number
  landmarks: NormalizedLandmark[] | null
  worldLandmarks: NormalizedLandmark[] | null
}

export const PROCESS_FPS = 15

function seekTo(video: HTMLVideoElement, timeS: number): Promise<void> {
  // Already at position — some browsers (especially mobile) don't fire seeked
  if (Math.abs(video.currentTime - timeS) < 0.001) return Promise.resolve()

  return new Promise((resolve) => {
    // Safety timeout: if seeked never fires (common on iOS), resolve anyway
    const timeout = setTimeout(resolve, 500)
    function onSeeked() {
      clearTimeout(timeout)
      video.removeEventListener("seeked", onSeeked)
      resolve()
    }
    video.addEventListener("seeked", onSeeked)
    video.currentTime = timeS
  })
}

export async function processVideo(
  video: HTMLVideoElement,
  model: ModelSize,
  exercise: ExerciseType,
  onProgress: (progress: number) => void
): Promise<FrameResult[]> {
  const duration = video.duration
  if (!duration || !isFinite(duration)) {
    throw new Error("Video duration unavailable — ensure video is fully loaded")
  }

  const totalFrames = Math.ceil(duration * PROCESS_FPS)
  const landmarker = await createVideoLandmarker(model)
  const results: FrameResult[] = []
  let repState: RepState = { count: 0, phase: "up" }

  for (let i = 0; i < totalFrames; i++) {
    const timeS = i / PROCESS_FPS
    await seekTo(video, timeS)

    const detection = landmarker.detectForVideo(video, timeS * 1000)
    const landmarks = (detection.landmarks?.[0] as NormalizedLandmark[] | undefined) ?? null
    const worldLandmarks = (detection.worldLandmarks?.[0] as NormalizedLandmark[] | undefined) ?? null

    let score = 0
    let feedback = "No pose detected"
    let primaryAngle = 0

    if (worldLandmarks) {
      const { analysis, newRepState } = analyzeFrame(exercise, worldLandmarks, repState)
      repState = newRepState
      score = analysis.score
      feedback = analysis.feedback
      primaryAngle = analysis.primaryAngle
    }

    results.push({ timeMs: timeS * 1000, frameIndex: i, score, feedback, primaryAngle, landmarks, worldLandmarks })
    onProgress((i + 1) / totalFrames)
  }

  landmarker.close()
  return results
}
