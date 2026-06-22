import Link from "next/link"
import { EXERCISE_LABELS } from "@/types"
import type { ExerciseType } from "@/types"

interface Props {
  id: string
  exercise: string
  avgScore: string | null
  repCount: number | null
  durationS: number | null
  createdAt: Date | null
}

export function SessionCard({ id, exercise, avgScore, repCount, durationS, createdAt }: Props) {
  const date = createdAt
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(createdAt))
    : "—"

  return (
    <Link href={`/session/${id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{EXERCISE_LABELS[exercise as ExerciseType]}</p>
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-lg font-bold text-emerald-600">{avgScore ?? "—"}</p>
            <p className="text-xs text-gray-400">score</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{repCount ?? 0}</p>
            <p className="text-xs text-gray-400">reps</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{durationS ?? 0}s</p>
            <p className="text-xs text-gray-400">time</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
