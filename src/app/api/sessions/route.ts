import { headers } from "next/headers"
import { desc, eq, isNull, gte, and, count } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { workoutSessions, trainingSessions } from "@/db/schema"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const results = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, session.user.id))
    .orderBy(desc(workoutSessions.createdAt))

  return Response.json(results)
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const userId = session.user.id

  // Find or create an open training session within the last 90 minutes
  const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000)
  const [openTrainingSession] = await db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.userId, userId),
        isNull(trainingSessions.endedAt),
        gte(trainingSessions.startedAt, ninetyMinAgo)
      )
    )
    .limit(1)

  const trainingSessionId = openTrainingSession?.id ?? (
    await db
      .insert(trainingSessions)
      .values({ userId, startedAt: new Date() })
      .returning()
  )[0].id

  // Determine set number for this exercise in this training session
  const [{ value: existingSetCount }] = await db
    .select({ value: count() })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.trainingSessionId, trainingSessionId),
        eq(workoutSessions.exercise, body.exercise)
      )
    )
  const setNumber = Number(existingSetCount) + 1

  const [inserted] = await db
    .insert(workoutSessions)
    .values({
      userId,
      trainingSessionId,
      exercise: body.exercise,
      setNumber,
      durationS: body.duration_s,
      repCount: body.rep_count,
      weightKg: body.weight_kg != null ? String(body.weight_kg) : null,
      avgScore: String(body.avg_score),
      peakScore: String(body.peak_score),
      primaryAngleAvg: body.primary_angle_avg != null ? String(body.primary_angle_avg) : null,
      primaryAngleMin: body.primary_angle_min != null ? String(body.primary_angle_min) : null,
      secondaryAngleAvg: body.secondary_angle_avg != null ? String(body.secondary_angle_avg) : null,
      feedback: body.feedback,
      videoUrl: body.video_url ?? null,
      pointCloudUrl: body.point_cloud_url ?? null,
    })
    .returning()

  return Response.json({ id: inserted.id, training_session_id: trainingSessionId })
}
