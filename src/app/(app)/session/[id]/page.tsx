import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { workoutSessions } from "@/db/schema"
import { EXERCISE_LABELS } from "@/types"
import type { ExerciseType } from "@/types"

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const [workout] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, session.user.id)))

  if (!workout) notFound()

  const feedback = workout.feedback as { suggestions: string[] } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Session Results</h1>
        <Link href="/dashboard" className="text-sm text-emerald-600 hover:underline">
          ← Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Exercise</p>
        <p className="text-xl font-semibold text-gray-900">
          {EXERCISE_LABELS[workout.exercise as ExerciseType]}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{workout.avgScore}</p>
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
