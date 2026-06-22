"use client"

import { useEffect, useRef, useState } from "react"
import type { NormalizedLandmark } from "@mediapipe/tasks-vision"
import { getPoseLandmarker } from "@/lib/mediapipe"
import { analyzeFrame } from "@/utils/exerciseAnalyzer"
import type { ExerciseType } from "@/types"
import type { AnalysisResult, RepState } from "@/utils/exerciseAnalyzer"

interface Props {
  exercise: ExerciseType
  isActive: boolean
  onFrame: (result: AnalysisResult, repCount: number) => void
}

export function PoseCamera({ exercise, isActive, onFrame }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const repStateRef = useRef<RepState>({ count: 0, phase: "up" })
  const onFrameRef = useRef(onFrame)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => { onFrameRef.current = onFrame }, [onFrame])

  // Start webcam on mount
  useEffect(() => {
    let stream: MediaStream

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        await getPoseLandmarker()
        setStatus("ready")
      } catch {
        setStatus("error")
      }
    }

    startCamera()
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Start/stop analysis loop based on isActive
  useEffect(() => {
    if (!isActive || status !== "ready") return

    repStateRef.current = { count: 0, phase: "up" }

    async function detect() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const landmarker = await getPoseLandmarker()
      const { PoseLandmarker, DrawingUtils } = await import("@mediapipe/tasks-vision")

      function loop() {
        if (!video || !canvas) return
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

        const ctx = canvas.getContext("2d")
        if (!ctx) { animFrameRef.current = requestAnimationFrame(loop); return }

        try {
          const results = landmarker.detectForVideo(video, performance.now())
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          if (results.landmarks[0]) {
            const lm = results.landmarks[0] as NormalizedLandmark[]
            const drawingUtils = new DrawingUtils(ctx)
            drawingUtils.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, {
              color: "#34d399",
              lineWidth: 2,
            })
            drawingUtils.drawLandmarks(lm, { radius: 4, color: "#10b981", fillColor: "#10b981" })

            const { analysis, newRepState } = analyzeFrame(exercise, lm, repStateRef.current)
            repStateRef.current = newRepState
            onFrameRef.current(analysis, newRepState.count)
          }
        } catch {
          // skip frame on error
        }

        animFrameRef.current = requestAnimationFrame(loop)
      }

      loop()
    }

    detect()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isActive, status, exercise])

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-white text-sm">Loading pose detection…</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-white text-sm">Camera access denied</p>
        </div>
      )}
    </div>
  )
}
