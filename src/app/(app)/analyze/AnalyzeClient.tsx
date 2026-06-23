"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ExerciseSelector } from "@/components/pose/ExerciseSelector"
import { PoseCamera } from "@/components/pose/PoseCamera"
import type { ExerciseType } from "@/types"
import type { AnalysisResult } from "@/utils/exerciseAnalyzer"

type Phase = "idle" | "active" | "prompting" | "saving"

interface SetAccumulator {
  scores: number[]
  primaryAngles: number[]
  secondaryAngles: number[]
  suggestions: string[]
  startTime: number
}

function freshAccumulator(): SetAccumulator {
  return { scores: [], primaryAngles: [], secondaryAngles: [], suggestions: [], startTime: Date.now() }
}

export function AnalyzeClient() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [exercise, setExercise] = useState<ExerciseType>("squat")
  const [currentScore, setCurrentScore] = useState(0)
  const [currentFeedback, setCurrentFeedback] = useState("")
  const [repCount, setRepCount] = useState(0)
  const [setCount, setSetCount] = useState(0)
  const [endingWorkout, setEndingWorkout] = useState(false)

  const accRef = useRef<SetAccumulator>(freshAccumulator())
  const repCountRef = useRef(0)

  const handleFrame = useCallback((result: AnalysisResult, reps: number) => {
    setCurrentScore(result.score)
    setCurrentFeedback(result.feedback)
    setRepCount(reps)
    repCountRef.current = reps
    if (result.score > 0) {
      accRef.current.scores.push(result.score)
      if (result.primaryAngle > 0) accRef.current.primaryAngles.push(result.primaryAngle)
      if (result.secondaryAngle > 0) accRef.current.secondaryAngles.push(result.secondaryAngle)
    }
    if (result.suggestions.length > 0) {
      accRef.current.suggestions.push(...result.suggestions)
    }
  }, [])

  function handleStart() {
    accRef.current = freshAccumulator()
    repCountRef.current = 0
    setCurrentScore(0)
    setCurrentFeedback("")
    setRepCount(0)
    setSetCount(0)
    setEndingWorkout(false)
    setPhase("active")
  }

  function handleSaveSet() {
    setEndingWorkout(false)
    setPhase("prompting")
  }

  function handleEndWorkout() {
    if (repCountRef.current > 0) {
      setEndingWorkout(true)
      setPhase("prompting")
    } else {
      router.push("/dashboard")
    }
  }

  async function handleWeightConfirm(weightKg: number | null) {
    setPhase("saving")
    const { scores, primaryAngles, secondaryAngles, suggestions, startTime } = accRef.current
    const duration_s = Math.round((Date.now() - startTime) / 1000)
    const avg_score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const peak_score = scores.length ? Math.max(...scores) : 0
    const primary_angle_avg = primaryAngles.length
      ? primaryAngles.reduce((a, b) => a + b, 0) / primaryAngles.length
      : null
    const primary_angle_min = primaryAngles.length ? Math.min(...primaryAngles) : null
    const secondary_angle_avg = secondaryAngles.length
      ? secondaryAngles.reduce((a, b) => a + b, 0) / secondaryAngles.length
      : null

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise,
          duration_s,
          rep_count: repCountRef.current,
          weight_kg: weightKg,
          avg_score: Math.round(avg_score * 10) / 10,
          peak_score: Math.round(peak_score * 10) / 10,
          primary_angle_avg: primary_angle_avg != null ? Math.round(primary_angle_avg * 10) / 10 : null,
          primary_angle_min: primary_angle_min != null ? Math.round(primary_angle_min * 10) / 10 : null,
          secondary_angle_avg: secondary_angle_avg != null ? Math.round(secondary_angle_avg * 10) / 10 : null,
          feedback: { suggestions: [...new Set(suggestions)].slice(0, 5) },
        }),
      })

      if (endingWorkout) {
        router.push("/dashboard")
        return
      }

      // Reset for next set
      accRef.current = freshAccumulator()
      repCountRef.current = 0
      setRepCount(0)
      setCurrentScore(0)
      setCurrentFeedback("")
      setSetCount((n) => n + 1)
      setPhase("active")
    } catch {
      setPhase("active")
    }
  }

  function handleWeightSkip() {
    void handleWeightConfirm(null)
  }

  const isRecording = phase === "active"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analyze</h1>
        {phase !== "idle" && (
          <div className="flex items-center gap-2">
            {phase === "active" && (
              <button
                onClick={handleSaveSet}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Save Set
              </button>
            )}
            <button
              onClick={handleEndWorkout}
              disabled={phase === "saving"}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              End Workout
            </button>
          </div>
        )}
      </div>

      {phase === "idle" && (
        <div className="space-y-6">
          <ExerciseSelector value={exercise} onChange={setExercise} />
          <button
            onClick={handleStart}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Start Workout
          </button>
        </div>
      )}

      {phase !== "idle" && (
        <div className="space-y-4">
          {/* Exercise selector — stays available between sets */}
          <ExerciseSelector value={exercise} onChange={setExercise} />

          <div className="relative">
            <PoseCamera exercise={exercise} isActive={isRecording} onFrame={handleFrame} />

            {/* Weight modal overlay */}
            {phase === "prompting" && (
              <WeightModal
                setNumber={setCount + 1}
                exercise={exercise}
                repCount={repCountRef.current}
                onConfirm={handleWeightConfirm}
                onSkip={handleWeightSkip}
              />
            )}
            {phase === "saving" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                <p className="text-white text-sm">Saving…</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{Math.round(currentScore)}</p>
              <p className="text-xs text-gray-500 mt-1">Form Score</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{repCount}</p>
              <p className="text-xs text-gray-500 mt-1">Reps</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xl font-bold text-gray-600">Set {setCount + 1}</p>
              <p className="text-xs text-gray-500 mt-1">Current</p>
            </div>
          </div>

          {currentFeedback && (
            <p className="text-sm text-gray-600 text-center">{currentFeedback}</p>
          )}
        </div>
      )}
    </div>
  )
}

function WeightModal({
  setNumber,
  exercise,
  repCount,
  onConfirm,
  onSkip,
}: {
  setNumber: number
  exercise: ExerciseType
  repCount: number
  onConfirm: (kg: number | null) => void
  onSkip: () => void
}) {
  const [value, setValue] = useState("")

  function handleConfirm() {
    const kg = parseFloat(value)
    onConfirm(isNaN(kg) || kg <= 0 ? null : kg)
  }

  return (
    <div className="absolute inset-0 flex items-end justify-center bg-black/60 rounded-xl pb-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs mx-4 shadow-xl">
        <p className="text-sm font-semibold text-gray-900 text-center">
          Set {setNumber} saved — {repCount} reps
        </p>
        <p className="text-xs text-gray-500 text-center mt-1 mb-4 capitalize">{exercise}</p>

        <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="e.g. 60 — leave blank for bodyweight"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={onSkip}
            className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
