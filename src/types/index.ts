export type ExerciseType = 'squat' | 'pushup' | 'plank' | 'lunge'

export interface WorkoutSession {
  id: string
  user_id: string
  exercise: ExerciseType
  duration_s: number
  rep_count: number
  avg_score: number
  peak_score: number
  feedback: SessionFeedback
  created_at: string
}

export interface SessionFeedback {
  suggestions: string[]
  reps: RepData[]
}

export interface RepData {
  rep_number: number
  score: number
  issues: string[]
}

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface ExerciseAnalysis {
  exerciseType: ExerciseType
  angles: Record<string, number | null>
  score: number
  feedback: string
  suggestions: string[]
  isRepComplete: boolean
}

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  squat: 'Squat',
  pushup: 'Push-up',
  plank: 'Plank',
  lunge: 'Lunge',
}
