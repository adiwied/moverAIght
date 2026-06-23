import { headers } from "next/headers"
import { desc, eq, asc } from "drizzle-orm"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { workoutSessions, trainingSessions } from "@/db/schema"
import { ProgressChart } from "@/components/dashboard/ProgressChart"
import { TrainingSessionCard } from "@/components/dashboard/TrainingSessionCard"
import { SessionCard } from "@/components/dashboard/SessionCard"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const userId = session.user.id

  const [allTrainingSessions, allWorkoutSessions] = await Promise.all([
    db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.userId, userId))
      .orderBy(desc(trainingSessions.startedAt)),
    db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(asc(workoutSessions.createdAt)),
  ])

  // Group workout sessions by training session
  const grouped = allTrainingSessions.map((ts) => ({
    trainingSession: ts,
    sets: allWorkoutSessions.filter((ws) => ws.trainingSessionId === ts.id),
  }))

  // Legacy sessions without a training session (recorded before this feature)
  const legacy = allWorkoutSessions.filter((ws) => !ws.trainingSessionId)

  const hasAnyData = allTrainingSessions.length > 0 || legacy.length > 0

  const chartData = [...allWorkoutSessions]
    .filter((s) => s.avgScore)
    .map((s) => ({
      date: s.createdAt
        ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(s.createdAt))
        : "—",
      score: parseFloat(s.avgScore ?? "0"),
      exercise: s.exercise,
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/prototype"
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Prototype
          </Link>
          <Link
            href="/analyze"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            New Session
          </Link>
        </div>
      </div>

      {!hasAnyData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-gray-400 text-sm">No sessions yet.</p>
          <Link href="/analyze" className="mt-3 text-sm text-emerald-600 hover:underline">
            Start your first session →
          </Link>
        </div>
      ) : (
        <>
          {chartData.length > 0 && <ProgressChart data={chartData} />}

          {grouped.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Training History</h2>
              {grouped.map(({ trainingSession, sets }) => (
                <TrainingSessionCard
                  key={trainingSession.id}
                  trainingSession={trainingSession}
                  sets={sets}
                />
              ))}
            </div>
          )}

          {legacy.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500">Earlier Sessions</h2>
              {legacy.map((s) => (
                <SessionCard
                  key={s.id}
                  id={s.id}
                  exercise={s.exercise}
                  avgScore={s.avgScore}
                  repCount={s.repCount}
                  durationS={s.durationS}
                  createdAt={s.createdAt}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
