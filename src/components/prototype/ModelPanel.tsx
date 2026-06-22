"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { NormalizedLandmark } from "@mediapipe/tasks-vision"
import type { FrameResult } from "@/utils/videoProcessor"
import { PROCESS_FPS } from "@/utils/videoProcessor"
import type { ModelSize } from "@/lib/mediapipe"
import { MODEL_LABELS } from "@/lib/mediapipe"
import type { ExerciseType } from "@/types"

const SkeletonViewer = dynamic(
  () => import("./SkeletonViewer").then((m) => m.SkeletonViewer),
  { ssr: false }
)

interface Props {
  model: ModelSize
  exercise: ExerciseType
  results: FrameResult[]
  videoRef: React.RefObject<HTMLVideoElement | null>
}

type MpModule = typeof import("@mediapipe/tasks-vision")

export function ModelPanel({ model, exercise, results, videoRef }: Props) {
  const [show3D, setShow3D] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const scoreRef = useRef<HTMLSpanElement | null>(null)
  const feedbackRef = useRef<HTMLSpanElement | null>(null)
  const mpRef = useRef<MpModule | null>(null)

  useEffect(() => {
    let mounted = true

    void import("@mediapipe/tasks-vision").then((mp) => {
      if (mounted) mpRef.current = mp
    })

    function findFrame(): FrameResult | null {
      const video = videoRef.current
      if (!video || !results.length) return null
      const idx = Math.min(Math.round(video.currentTime * PROCESS_FPS), results.length - 1)
      return results[idx] ?? null
    }

    function loop() {
      if (!mounted) return

      const video = videoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const vw = video.videoWidth
      const vh = video.videoHeight

      if (vw > 0 && vh > 0) {
        if (canvas.width !== vw) canvas.width = vw
        if (canvas.height !== vh) canvas.height = vh

        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(video, 0, 0, vw, vh)

          const frame = findFrame()

          if (frame?.landmarks && mpRef.current) {
            const { DrawingUtils, PoseLandmarker } = mpRef.current
            const du = new DrawingUtils(ctx)
            du.drawConnectors(
              frame.landmarks as NormalizedLandmark[],
              PoseLandmarker.POSE_CONNECTIONS,
              { color: "#34d399", lineWidth: 2 }
            )
            du.drawLandmarks(frame.landmarks as NormalizedLandmark[], {
              radius: 4,
              color: "#10b981",
              fillColor: "#10b981",
            })
          }

          if (frame) {
            if (scoreRef.current) scoreRef.current.textContent = String(frame.score)
            if (feedbackRef.current) feedbackRef.current.textContent = frame.feedback
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      mounted = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [results, videoRef])

  const frames = results.map((r) => r.worldLandmarks)

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">{MODEL_LABELS[model]}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShow3D(true)}
              className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
            >
              View 3D
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Score</span>
              <span ref={scoreRef} className="text-sm font-bold text-emerald-600 tabular-nums w-8 text-right">
                —
              </span>
            </div>
          </div>
        </div>
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
        </div>
        <p className="text-xs text-gray-500 min-h-[1rem]">
          <span ref={feedbackRef} />
        </p>
      </div>

      {show3D && (
        <SkeletonViewer
          frames={frames}
          modelName={MODEL_LABELS[model]}
          exercise={exercise}
          onClose={() => setShow3D(false)}
        />
      )}
    </>
  )
}
