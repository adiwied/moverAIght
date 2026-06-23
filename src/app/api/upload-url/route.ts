import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { createServerSupabaseClient } from "@/lib/supabase"

const BUCKET = "workout-media"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { uploadId, filename } = await request.json()
  const userId = session.user.id
  const path = `${userId}/${uploadId}/${filename}`

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`

  return Response.json({ signedUrl: data.signedUrl, publicUrl })
}
