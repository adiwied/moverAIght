import type { NormalizedLandmark } from "@mediapipe/tasks-vision"
import type { ExerciseType } from "@/types"
import { calculateAngle, allVisible } from "./angleUtils"

export interface AnalysisResult {
  score: number
  feedback: string
  primaryAngle: number
  suggestions: string[]
}

export interface RepState {
  count: number
  phase: "up" | "down"
}

// Landmark indices
const L = {
  LShoulder: 11, RShoulder: 12,
  LElbow: 13,    RElbow: 14,
  LWrist: 15,    RWrist: 16,
  LHip: 23,      RHip: 24,
  LKnee: 25,     RKnee: 26,
  LAnkle: 27,    RAnkle: 28,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

function analyzeSquat(
  lm: NormalizedLandmark[],
  repState: RepState
): { result: AnalysisResult; newRepState: RepState } {
  if (!allVisible(lm, [L.LHip, L.LKnee, L.LAnkle])) {
    return {
      result: { score: 0, feedback: "Step back so your full body is visible", primaryAngle: 0, suggestions: [] },
      newRepState: repState,
    }
  }

  const kneeAngle = calculateAngle(lm[L.LHip], lm[L.LKnee], lm[L.LAnkle])

  let score: number
  let feedback: string
  const suggestions: string[] = []

  if (kneeAngle > 150) {
    score = 50
    feedback = "Start your squat"
  } else if (kneeAngle < 70) {
    score = 100
    feedback = "Great depth!"
  } else if (kneeAngle < 100) {
    score = Math.round(mapRange(kneeAngle, 100, 70, 70, 100))
    feedback = "Good depth!"
  } else {
    score = Math.round(mapRange(kneeAngle, 150, 100, 20, 70))
    feedback = "Go deeper!"
    suggestions.push("Aim to get your thighs parallel to the floor")
  }

  // Rep counting: down when angle < 100, up when angle > 155
  let newRepState = repState
  if (repState.phase === "up" && kneeAngle < 100) {
    newRepState = { count: repState.count, phase: "down" }
  } else if (repState.phase === "down" && kneeAngle > 155) {
    newRepState = { count: repState.count + 1, phase: "up" }
  }

  return { result: { score, feedback, primaryAngle: kneeAngle, suggestions }, newRepState }
}

function analyzePushup(
  lm: NormalizedLandmark[],
  repState: RepState
): { result: AnalysisResult; newRepState: RepState } {
  if (!allVisible(lm, [L.LShoulder, L.LElbow, L.LWrist])) {
    return {
      result: { score: 0, feedback: "Step back so your full body is visible", primaryAngle: 0, suggestions: [] },
      newRepState: repState,
    }
  }

  const elbowAngle = calculateAngle(lm[L.LShoulder], lm[L.LElbow], lm[L.LWrist])

  let score: number
  let feedback: string
  const suggestions: string[] = []

  if (elbowAngle > 155) {
    score = 50
    feedback = "Lower yourself down"
  } else if (elbowAngle < 70) {
    score = 100
    feedback = "Full depth!"
  } else if (elbowAngle < 90) {
    score = Math.round(mapRange(elbowAngle, 90, 70, 75, 100))
    feedback = "Great depth!"
  } else {
    score = Math.round(mapRange(elbowAngle, 155, 90, 20, 75))
    feedback = "Go lower!"
    suggestions.push("Lower your chest closer to the floor")
  }

  let newRepState = repState
  if (repState.phase === "up" && elbowAngle < 90) {
    newRepState = { count: repState.count, phase: "down" }
  } else if (repState.phase === "down" && elbowAngle > 155) {
    newRepState = { count: repState.count + 1, phase: "up" }
  }

  return { result: { score, feedback, primaryAngle: elbowAngle, suggestions }, newRepState }
}

function analyzePlank(
  lm: NormalizedLandmark[],
  repState: RepState
): { result: AnalysisResult; newRepState: RepState } {
  if (!allVisible(lm, [L.LShoulder, L.LHip, L.LAnkle])) {
    return {
      result: { score: 0, feedback: "Make sure your full body is visible", primaryAngle: 0, suggestions: [] },
      newRepState: repState,
    }
  }

  const bodyAngle = calculateAngle(lm[L.LShoulder], lm[L.LHip], lm[L.LAnkle])
  const deviation = Math.abs(bodyAngle - 180)
  const score = clamp(Math.round(100 - deviation * 2), 0, 100)

  let feedback: string
  const suggestions: string[] = []

  if (deviation < 10) {
    feedback = "Perfect alignment!"
  } else if (lm[L.LHip].y < lm[L.LShoulder].y && lm[L.LHip].y < lm[L.LAnkle].y) {
    feedback = "Lower your hips"
    suggestions.push("Keep your body in a straight line from head to heels")
  } else {
    feedback = "Raise your hips"
    suggestions.push("Engage your core to lift your hips into alignment")
  }

  return { result: { score, feedback, primaryAngle: bodyAngle, suggestions }, newRepState: repState }
}

function analyzeLunge(
  lm: NormalizedLandmark[],
  repState: RepState
): { result: AnalysisResult; newRepState: RepState } {
  const leftVisible = allVisible(lm, [L.LHip, L.LKnee, L.LAnkle])
  const rightVisible = allVisible(lm, [L.RHip, L.RKnee, L.RAnkle])

  if (!leftVisible && !rightVisible) {
    return {
      result: { score: 0, feedback: "Step back so your full body is visible", primaryAngle: 0, suggestions: [] },
      newRepState: repState,
    }
  }

  const leftAngle = leftVisible ? calculateAngle(lm[L.LHip], lm[L.LKnee], lm[L.LAnkle]) : 180
  const rightAngle = rightVisible ? calculateAngle(lm[L.RHip], lm[L.RKnee], lm[L.RAnkle]) : 180
  const frontKneeAngle = Math.min(leftAngle, rightAngle)

  const deviation = Math.abs(frontKneeAngle - 90)
  const score = clamp(Math.round(100 - deviation), 0, 100)

  let feedback: string
  const suggestions: string[] = []

  if (deviation < 10) {
    feedback = "Perfect lunge depth!"
  } else if (frontKneeAngle > 100) {
    feedback = "Lunge deeper"
    suggestions.push("Lower your back knee closer to the floor")
  } else {
    feedback = "Don't overextend"
    suggestions.push("Keep your front knee above your ankle")
  }

  let newRepState = repState
  if (repState.phase === "up" && frontKneeAngle < 105) {
    newRepState = { count: repState.count, phase: "down" }
  } else if (repState.phase === "down" && frontKneeAngle > 155) {
    newRepState = { count: repState.count + 1, phase: "up" }
  }

  return { result: { score, feedback, primaryAngle: frontKneeAngle, suggestions }, newRepState }
}

export function analyzeFrame(
  exercise: ExerciseType,
  landmarks: NormalizedLandmark[],
  repState: RepState
): { analysis: AnalysisResult; newRepState: RepState } {
  const analyzers = { squat: analyzeSquat, pushup: analyzePushup, plank: analyzePlank, lunge: analyzeLunge }
  const { result, newRepState } = analyzers[exercise](landmarks, repState)
  return { analysis: result, newRepState }
}
