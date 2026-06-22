import { headers } from "next/headers"
import { desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { workoutSessions } from "@/db/schema"

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

  const [inserted] = await db
    .insert(workoutSessions)
    .values({
      userId: session.user.id,
      exercise: body.exercise,
      durationS: body.duration_s,
      repCount: body.rep_count,
      avgScore: String(body.avg_score),
      peakScore: String(body.peak_score),
      feedback: body.feedback,
    })
    .returning()

  return Response.json({ id: inserted.id })
}
