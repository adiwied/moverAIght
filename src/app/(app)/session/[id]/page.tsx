import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { workoutSessions } from "@/db/schema"
import { EXERCISE_LABELS } from "@/types"
import type { ExerciseType } from "@/types"
import { SessionDetailClient } from "./SessionDetailClient"

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const [workout] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, session.user.id)))

  if (!workout) notFound()

  const feedback = workout.feedback as { suggestions?: string[] } | null
  const hasMedia = !!(workout.videoUrl && workout.pointCloudUrl)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            {workout.setNumber ? `Set ${workout.setNumber}` : "Session"}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {EXERCISE_LABELS[workout.exercise as ExerciseType]}
          </h1>
        </div>
        <Link href="/dashboard" className="text-sm text-emerald-600 hover:underline">
          ← Dashboard
        </Link>
      </div>

      {/* Video replay + 3D viewer */}
      {hasMedia && (
        <SessionDetailClient
          videoUrl={workout.videoUrl!}
          pointCloudUrl={workout.pointCloudUrl!}
          exercise={workout.exercise as ExerciseType}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{workout.avgScore ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Avg Score</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{workout.repCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Reps</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{workout.durationS ?? 0}s</p>
          <p className="text-xs text-gray-500 mt-1">Duration</p>
        </div>
      </div>

      {/* Angle metrics */}
      {(workout.primaryAngleAvg || workout.primaryAngleMin) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-4">
          {workout.primaryAngleAvg && (
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{Math.round(parseFloat(workout.primaryAngleAvg))}°</p>
              <p className="text-xs text-gray-500 mt-1">Avg Angle</p>
            </div>
          )}
          {workout.primaryAngleMin && (
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{Math.round(parseFloat(workout.primaryAngleMin))}°</p>
              <p className="text-xs text-gray-500 mt-1">Depth (min)</p>
            </div>
          )}
        </div>
      )}

      {/* Coaching tips */}
      {feedback?.suggestions && feedback.suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Coaching Tips</h2>
          <ul className="space-y-2">
            {feedback.suggestions.map((tip, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/analyze"
        className="block w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-center hover:bg-emerald-700 transition-colors"
      >
        New Session
      </Link>
    </div>
  )
}
