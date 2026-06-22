"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ExerciseSelector } from "@/components/pose/ExerciseSelector"
import { PoseCamera } from "@/components/pose/PoseCamera"
import type { ExerciseType } from "@/types"
import type { AnalysisResult } from "@/utils/exerciseAnalyzer"

type Phase = "idle" | "active" | "saving"

export function AnalyzeClient() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [exercise, setExercise] = useState<ExerciseType>("squat")
  const [currentScore, setCurrentScore] = useState(0)
  const [currentFeedback, setCurrentFeedback] = useState("")
  const [repCount, setRepCount] = useState(0)

  const sessionRef = useRef({
    scores: [] as number[],
    suggestions: [] as string[],
    startTime: 0,
  })

  const handleFrame = useCallback((result: AnalysisResult, reps: number) => {
    setCurrentScore(result.score)
    setCurrentFeedback(result.feedback)
    setRepCount(reps)
    if (result.score > 0) sessionRef.current.scores.push(result.score)
    if (result.suggestions.length > 0) {
      sessionRef.current.suggestions.push(...result.suggestions)
    }
  }, [])

  function handleStart() {
    sessionRef.current = { scores: [], suggestions: [], startTime: Date.now() }
    setCurrentScore(0)
    setCurrentFeedback("")
    setRepCount(0)
    setPhase("active")
  }

  async function handleEnd() {
    setPhase("saving")
    const { scores, suggestions, startTime } = sessionRef.current
    const duration_s = Math.round((Date.now() - startTime) / 1000)
    const avg_score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const peak_score = scores.length ? Math.max(...scores) : 0

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise,
          duration_s,
          rep_count: repCount,
          avg_score: Math.round(avg_score * 10) / 10,
          peak_score: Math.round(peak_score * 10) / 10,
          feedback: {
            suggestions: [...new Set(suggestions)].slice(0, 5),
            reps: [],
          },
        }),
      })
      const { id } = await res.json()
      router.push(`/session/${id}`)
    } catch {
      setPhase("active")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analyze</h1>
        {phase === "active" && (
          <button
            onClick={handleEnd}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            End Session
          </button>
        )}
      </div>

      {phase === "idle" && (
        <div className="space-y-6">
          <ExerciseSelector value={exercise} onChange={setExercise} />
          <button
            onClick={handleStart}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Start Session
          </button>
        </div>
      )}

      {(phase === "active" || phase === "saving") && (
        <div className="space-y-4">
          <PoseCamera exercise={exercise} isActive={phase === "active"} onFrame={handleFrame} />

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
              <p className="text-sm font-medium text-gray-700 leading-tight min-h-[2rem] flex items-center justify-center">
                {currentFeedback || "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Feedback</p>
            </div>
          </div>

          {phase === "saving" && (
            <div className="flex items-center justify-center py-4">
              <p className="text-sm text-gray-500">Saving session…</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
