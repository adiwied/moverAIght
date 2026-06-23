"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { NormalizedLandmark } from "@mediapipe/tasks-vision"
import type { ExerciseType } from "@/types"
import type { FrameResult } from "@/utils/videoProcessor"
import { PROCESS_FPS } from "@/utils/videoProcessor"

const SkeletonViewer = dynamic(
  () => import("@/components/prototype/SkeletonViewer").then((m) => m.SkeletonViewer),
  { ssr: false }
)

type MpModule = typeof import("@mediapipe/tasks-vision")

interface Props {
  videoUrl: string
  pointCloudUrl: string
  exercise: ExerciseType
  modelName?: string
}

export function SessionDetailClient({ videoUrl, pointCloudUrl, exercise, modelName = "Full" }: Props) {
  const [results, setResults] = useState<FrameResult[] | null>(null)
  const [show3D, setShow3D] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const mpRef = useRef<MpModule | null>(null)
  const rangeRef = useRef<HTMLInputElement | null>(null)

  // Load point cloud
  useEffect(() => {
    fetch(pointCloudUrl)
      .then((r) => r.json())
      .then((data: FrameResult[]) => setResults(data))
      .catch(() => setResults([]))
  }, [pointCloudUrl])

  // Load mediapipe drawing utils
  useEffect(() => {
    void import("@mediapipe/tasks-vision").then((mp) => { mpRef.current = mp })
  }, [])

  // Canvas overlay RAF loop
  useEffect(() => {
    if (!results) return
    let mounted = true

    function findFrame(): FrameResult | null {
      const video = videoRef.current
      if (!video || !results?.length) return null
      const idx = Math.min(Math.round(video.currentTime * PROCESS_FPS), results.length - 1)
      return results[idx] ?? null
    }

    function loop() {
      if (!mounted) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas) {
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
              du.drawConnectors(frame.landmarks as NormalizedLandmark[], PoseLandmarker.POSE_CONNECTIONS, {
                color: "#34d399", lineWidth: 2,
              })
              du.drawLandmarks(frame.landmarks as NormalizedLandmark[], {
                radius: 4, color: "#10b981", fillColor: "#10b981",
              })
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => { mounted = false; cancelAnimationFrame(rafRef.current) }
  }, [results])

  // Scrubber sync
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    function onTimeUpdate() {
      if (rangeRef.current && videoRef.current) {
        rangeRef.current.value = String(videoRef.current.currentTime)
      }
    }
    video.addEventListener("timeupdate", onTimeUpdate)
    return () => video.removeEventListener("timeupdate", onTimeUpdate)
  }, [])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { void video.play(); setIsPlaying(true) }
    else { video.pause(); setIsPlaying(false) }
  }

  const frames = results?.map((r) => r.worldLandmarks) ?? []

  if (!results) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-400">Loading recording…</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Video with overlay */}
        <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            playsInline
            onEnded={() => setIsPlaying(false)}
            style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1 }}
          />
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="3" width="5" height="18" rx="1" />
                <rect x="14" y="3" width="5" height="18" rx="1" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 20,12 5,21" />
              </svg>
            )}
          </button>
          <input
            ref={rangeRef}
            type="range"
            min={0}
            max={videoRef.current?.duration || results.length / PROCESS_FPS || 1}
            step={1 / PROCESS_FPS}
            defaultValue={0}
            onChange={(e) => {
              const video = videoRef.current
              if (video) video.currentTime = parseFloat(e.target.value)
            }}
            className="flex-1 accent-emerald-600 cursor-pointer"
          />
          <button
            onClick={() => setShow3D(true)}
            className="text-xs text-gray-400 hover:text-emerald-600 transition-colors whitespace-nowrap"
          >
            View 3D
          </button>
        </div>
      </div>

      {show3D && frames.length > 0 && (
        <SkeletonViewer
          frames={frames}
          modelName={modelName}
          exercise={exercise}
          onClose={() => setShow3D(false)}
        />
      )}
    </>
  )
}
