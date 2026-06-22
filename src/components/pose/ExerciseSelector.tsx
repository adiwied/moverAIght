"use client"

import type { ExerciseType } from "@/types"
import { EXERCISE_LABELS } from "@/types"

interface Props {
  value: ExerciseType
  onChange: (exercise: ExerciseType) => void
}

const exercises: ExerciseType[] = ["squat", "pushup", "plank", "lunge"]

export function ExerciseSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">Choose exercise</p>
      <div className="flex gap-2 flex-wrap">
        {exercises.map((ex) => (
          <button
            key={ex}
            onClick={() => onChange(ex)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              value === ex
                ? "bg-emerald-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600"
            }`}
          >
            {EXERCISE_LABELS[ex]}
          </button>
        ))}
      </div>
    </div>
  )
}
