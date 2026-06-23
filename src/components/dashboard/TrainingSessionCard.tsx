import Link from "next/link"
import { EXERCISE_LABELS } from "@/types"
import type { ExerciseType } from "@/types"
import type { trainingSessions, workoutSessions } from "@/db/schema"
import type { InferSelectModel } from "drizzle-orm"

type TrainingSession = InferSelectModel<typeof trainingSessions>
type WorkoutSession = InferSelectModel<typeof workoutSessions>

interface Props {
  trainingSession: TrainingSession
  sets: WorkoutSession[]
}

// Group sets by exercise, preserving insertion order
function groupByExercise(sets: WorkoutSession[]): Map<string, WorkoutSession[]> {
  const map = new Map<string, WorkoutSession[]>()
  for (const s of sets) {
    const key = s.exercise
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return map
}

function formatDuration(startedAt: Date, sets: WorkoutSession[]): string {
  const lastSet = sets.at(-1)
  const endMs = lastSet?.createdAt ? new Date(lastSet.createdAt).getTime() : null
  const startMs = new Date(startedAt).getTime()
  if (!endMs || endMs <= startMs) return ""
  const mins = Math.round((endMs - startMs) / 60000)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function TrainingSessionCard({ trainingSession, sets }: Props) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(trainingSession.startedAt))

  const duration = formatDuration(trainingSession.startedAt, sets)
  const grouped = groupByExercise(sets)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Session header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{date}</span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {duration && <span>{duration}</span>}
          <span>{sets.length} {sets.length === 1 ? "set" : "sets"}</span>
        </div>
      </div>

      {/* Per-exercise breakdown */}
      <div className="divide-y divide-gray-50">
        {[...grouped.entries()].map(([exercise, exerciseSets]) => {
          const totalReps = exerciseSets.reduce((n, s) => n + (s.repCount ?? 0), 0)
          const scores = exerciseSets.map((s) => parseFloat(s.avgScore ?? "0")).filter((n) => n > 0)
          const avgForm = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
          const primaryMins = exerciseSets.map((s) => parseFloat(s.primaryAngleMin ?? "0")).filter((n) => n > 0)
          const primaryAvgs = exerciseSets.map((s) => parseFloat(s.primaryAngleAvg ?? "0")).filter((n) => n > 0)
          const weights = exerciseSets.map((s) => parseFloat(s.weightKg ?? "0")).filter((n) => n > 0)
          const maxWeight = weights.length ? Math.max(...weights) : null

          return (
            <div key={exercise} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {EXERCISE_LABELS[exercise as ExerciseType] ?? exercise}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {exerciseSets.length} {exerciseSets.length === 1 ? "set" : "sets"} · {totalReps} reps
                    {maxWeight ? ` · ${maxWeight}kg` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  {avgForm != null && (
                    <div>
                      <p className="text-base font-bold text-emerald-600">{avgForm}</p>
                      <p className="text-xs text-gray-400">form</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Angle metrics */}
              {(primaryAvgs.length > 0 || primaryMins.length > 0) && (
                <div className="flex gap-4 mt-2">
                  {primaryAvgs.length > 0 && (
                    <span className="text-xs text-gray-500">
                      Avg {Math.round(primaryAvgs.reduce((a, b) => a + b, 0) / primaryAvgs.length)}°
                    </span>
                  )}
                  {primaryMins.length > 0 && (
                    <span className="text-xs text-gray-500">
                      Depth {Math.round(Math.min(...primaryMins))}°
                    </span>
                  )}
                </div>
              )}

              {/* Per-set row */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {exerciseSets.map((s, i) => (
                  <Link
                    key={s.id}
                    href={`/session/${s.id}`}
                    className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent rounded px-2 py-1 transition-colors"
                  >
                    <span className="text-gray-400">S{i + 1}</span>
                    <span className="font-medium text-gray-700">{s.repCount ?? 0}r</span>
                    {s.weightKg && <span className="text-gray-400">{s.weightKg}kg</span>}
                    {s.avgScore && (
                      <span className="text-emerald-600 font-medium">{Math.round(parseFloat(s.avgScore))}</span>
                    )}
                    {s.videoUrl && <span className="text-gray-300">▶</span>}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
