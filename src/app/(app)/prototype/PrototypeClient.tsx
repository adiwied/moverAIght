"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { ExerciseType } from "@/types"
import { EXERCISE_LABELS } from "@/types"
import type { ModelSize } from "@/lib/mediapipe"
import { MODEL_LABELS } from "@/lib/mediapipe"
import { processVideo, type FrameResult } from "@/utils/videoProcessor"
import { ModelPanel } from "@/components/prototype/ModelPanel"

type Phase = "idle" | "processing" | "ready"
const EXERCISES: ExerciseType[] = ["squat", "pushup", "plank", "lunge"]
const MODELS: ModelSize[] = ["lite", "full", "heavy"]

export function PrototypeClient() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [exercise, setExercise] = useState<ExerciseType>("squat")
  const [modelA, setModelA] = useState<ModelSize>("lite")
  const [modelB, setModelB] = useState<ModelSize>("full")
  const [resultsA, setResultsA] = useState<FrameResult[] | null>(null)
  const [resultsB, setResultsB] = useState<FrameResult[] | null>(null)
  const [progressA, setProgressA] = useState(0)
  const [progressB, setProgressB] = useState(0)
  const [processingStep, setProcessingStep] = useState<"a" | "b" | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      const url = URL.createObjectURL(file)
      setVideoFile(file)
      setVideoUrl(url)
      setResultsA(null)
      setResultsB(null)
      setPhase("idle")
      setError(null)
      setVideoDuration(0)
    },
    [videoUrl]
  )

  const handleProcess = useCallback(async () => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    setError(null)
    setPhase("processing")
    setProgressA(0)
    setProgressB(0)

    try {
      if (!video.duration || !isFinite(video.duration)) {
        await new Promise<void>((res) => {
          video.addEventListener("loadedmetadata", () => res(), { once: true })
        })
      }

      setProcessingStep("a")
      const rA = await processVideo(video, modelA, exercise, (p) => setProgressA(p))
      setResultsA(rA)

      setProcessingStep("b")
      const rB = await processVideo(video, modelB, exercise, (p) => setProgressB(p))
      setResultsB(rB)

      video.currentTime = 0
      setPhase("ready")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed")
      setPhase("idle")
    } finally {
      setProcessingStep(null)
    }
  }, [videoUrl, modelA, modelB, exercise])

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleReset = useCallback(() => {
    const video = videoRef.current
    if (video) { video.pause(); video.currentTime = 0 }
    setIsPlaying(false)
    setPhase("idle")
    setResultsA(null)
    setResultsB(null)
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Model Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a video and compare pose detection across MediaPipe models side by side
        </p>
      </div>

      {/* Hidden video element — shared source for both panels */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          playsInline
          onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration ?? 0)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Setup / processing panel */}
      {phase !== "ready" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {/* File upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={phase === "processing"}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {videoFile ? videoFile.name : "Select video…"}
            </button>
          </div>

          {/* Exercise selector */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Exercise</p>
            <div className="flex gap-2 flex-wrap">
              {EXERCISES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExercise(ex)}
                  disabled={phase === "processing"}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                    exercise === ex
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {EXERCISE_LABELS[ex]}
                </button>
              ))}
            </div>
          </div>

          {/* Model selectors */}
          <div className="grid grid-cols-2 gap-4">
            <ModelSelect label="Model A" value={modelA} onChange={setModelA} disabled={phase === "processing"} />
            <ModelSelect label="Model B" value={modelB} onChange={setModelB} disabled={phase === "processing"} />
          </div>

          {/* Process / progress */}
          {phase !== "processing" ? (
            <button
              onClick={handleProcess}
              disabled={!videoFile}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
            >
              Process Video
            </button>
          ) : (
            <div className="space-y-3">
              <ProcessBar
                label={`Model A — ${MODEL_LABELS[modelA]}`}
                progress={progressA}
                state={processingStep === "a" ? "active" : "done"}
              />
              <ProcessBar
                label={`Model B — ${MODEL_LABELS[modelB]}`}
                progress={progressB}
                state={processingStep === "b" ? "active" : processingStep === null ? "done" : "waiting"}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {/* Results */}
      {phase === "ready" && resultsA && resultsB && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← New comparison
            </button>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {EXERCISE_LABELS[exercise]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ModelPanel model={modelA} results={resultsA} videoRef={videoRef} />
            <ModelPanel model={modelB} results={resultsB} videoRef={videoRef} />
          </div>

          <PlaybackControls
            videoRef={videoRef}
            duration={videoDuration}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
          />
        </div>
      )}
    </div>
  )
}

function ModelSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: ModelSize
  onChange: (m: ModelSize) => void
  disabled?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModelSize)}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {MODELS.map((m) => (
          <option key={m} value={m}>
            {MODEL_LABELS[m]}
          </option>
        ))}
      </select>
    </div>
  )
}

function ProcessBar({
  label,
  progress,
  state,
}: {
  label: string
  progress: number
  state: "waiting" | "active" | "done"
}) {
  const pct = Math.round(progress * 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{state === "done" ? "Done" : state === "active" ? `${pct}%` : "Waiting…"}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${state === "done" ? 100 : pct}%`,
            backgroundColor: state === "done" ? "#34d399" : "#059669",
          }}
        />
      </div>
    </div>
  )
}

function PlaybackControls({
  videoRef,
  duration,
  isPlaying,
  onPlayPause,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  duration: number
  isPlaying: boolean
  onPlayPause: () => void
}) {
  const rangeRef = useRef<HTMLInputElement | null>(null)

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
  }, [videoRef])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <button
        onClick={onPlayPause}
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
        max={duration || 1}
        step={1 / 15}
        defaultValue={0}
        onChange={(e) => {
          const video = videoRef.current
          if (video) video.currentTime = parseFloat(e.target.value)
        }}
        className="flex-1 accent-emerald-600 cursor-pointer"
      />
    </div>
  )
}
