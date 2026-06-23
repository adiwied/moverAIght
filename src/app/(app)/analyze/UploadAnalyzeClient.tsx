"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ExerciseType } from "@/types"
import { processVideo, type FrameResult } from "@/utils/videoProcessor"
import { ExerciseSelector } from "@/components/pose/ExerciseSelector"

type Phase = "idle" | "processing" | "prompting" | "uploading"

async function getSignedUploadUrl(uploadId: string, filename: string) {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, filename }),
  })
  if (!res.ok) throw new Error("Failed to get upload URL")
  return res.json() as Promise<{ signedUrl: string; publicUrl: string }>
}

async function uploadFile(signedUrl: string, body: BodyInit, contentType: string) {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  })
  if (!res.ok) throw new Error("Upload failed")
}

export function UploadAnalyzeClient() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [exercise, setExercise] = useState<ExerciseType>("squat")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const resultsRef = useRef<FrameResult[]>([])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      setVideoFile(file)
      setVideoUrl(URL.createObjectURL(file))
      setPhase("idle")
      setError(null)
      setProgress(0)
    },
    [videoUrl]
  )

  async function handleProcess() {
    const video = videoRef.current
    if (!video || !videoFile) return
    setError(null)
    setPhase("processing")
    setProgress(0)

    try {
      if (!video.duration || !isFinite(video.duration)) {
        await new Promise<void>((res) => {
          video.addEventListener("loadedmetadata", () => res(), { once: true })
        })
      }
      const results = await processVideo(video, "full", exercise, setProgress)
      resultsRef.current = results
      setPhase("prompting")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed")
      setPhase("idle")
    }
  }

  async function handleSave(weightKg: number | null) {
    const video = videoRef.current
    if (!video || !videoFile) return
    setPhase("uploading")

    const results = resultsRef.current
    const uploadId = crypto.randomUUID()
    const ext = videoFile.name.split(".").pop() ?? "mp4"

    const MAX_VIDEO_BYTES = 45 * 1024 * 1024 // 45 MB — Supabase free tier limit is 50 MB

    try {
      // Upload video (skip if too large for storage tier)
      let savedVideoUrl: string | null = null
      if (videoFile.size <= MAX_VIDEO_BYTES) {
        setUploadStatus("Uploading video…")
        const { signedUrl: videoSignedUrl, publicUrl: videoUrl } = await getSignedUploadUrl(
          uploadId,
          `video.${ext}`
        )
        await uploadFile(videoSignedUrl, videoFile, videoFile.type || "video/mp4")
        savedVideoUrl = videoUrl
      } else {
        setUploadStatus("Video too large to store — saving point cloud only…")
        await new Promise((r) => setTimeout(r, 1200))
      }

      // Upload point cloud
      setUploadStatus("Uploading point cloud…")
      const pointCloudJson = JSON.stringify(
        results.map((r) => ({
          timeMs: r.timeMs,
          frameIndex: r.frameIndex,
          score: r.score,
          feedback: r.feedback,
          primaryAngle: r.primaryAngle,
          landmarks: r.landmarks,
          worldLandmarks: r.worldLandmarks,
        }))
      )
      const { signedUrl: pcSignedUrl, publicUrl: pointCloudUrl } = await getSignedUploadUrl(
        uploadId,
        "pointcloud.json"
      )
      await uploadFile(pcSignedUrl, pointCloudJson, "application/json")

      // Compute metrics from frame results
      const scores = results.map((r) => r.score).filter((s) => s > 0)
      const primaryAngles = results.map((r) => r.primaryAngle).filter((a) => a > 0)
      const secondaryAngles = results.map((r) => r.secondaryAngle).filter((a) => a > 0)
      const avg_score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      const peak_score = scores.length ? Math.max(...scores) : 0
      const primary_angle_avg = primaryAngles.length
        ? primaryAngles.reduce((a, b) => a + b, 0) / primaryAngles.length
        : null
      const primary_angle_min = primaryAngles.length ? Math.min(...primaryAngles) : null
      const secondary_angle_avg = secondaryAngles.length
        ? secondaryAngles.reduce((a, b) => a + b, 0) / secondaryAngles.length
        : null
      const duration_s = Math.round((results.at(-1)?.timeMs ?? 0) / 1000)
      const rep_count = results.at(-1)?.repCount ?? 0

      setUploadStatus("Saving session…")
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise,
          duration_s,
          rep_count,
          weight_kg: weightKg,
          avg_score: Math.round(avg_score * 10) / 10,
          peak_score: Math.round(peak_score * 10) / 10,
          primary_angle_avg: primary_angle_avg != null ? Math.round(primary_angle_avg * 10) / 10 : null,
          primary_angle_min: primary_angle_min != null ? Math.round(primary_angle_min * 10) / 10 : null,
          secondary_angle_avg: secondary_angle_avg != null ? Math.round(secondary_angle_avg * 10) / 10 : null,
          feedback: {},
          video_url: savedVideoUrl,
          point_cloud_url: pointCloudUrl,
        }),
      })
      const { id } = await res.json()
      router.push(`/session/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setPhase("prompting")
    }
  }

  const pct = Math.round(progress * 100)

  return (
    <div className="space-y-6">
      {/* Hidden video for processing */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1 }}
        />
      )}

      {/* File picker */}
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
          disabled={phase === "processing" || phase === "uploading"}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-10 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {videoFile ? (
            <div>
              <p className="text-sm font-medium text-gray-800">{videoFile.name}</p>
              <p className="text-xs text-gray-400 mt-1">Tap to replace</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-600">Tap to select video</p>
              <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM</p>
            </div>
          )}
        </button>
      </div>

      {/* Exercise selector */}
      <ExerciseSelector value={exercise} onChange={setExercise} />

      {/* Process button */}
      {phase === "idle" && (
        <button
          onClick={handleProcess}
          disabled={!videoFile}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
        >
          Analyse Video
        </button>
      )}

      {/* Processing progress */}
      {phase === "processing" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Analysing…</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploading */}
      {phase === "uploading" && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">{uploadStatus}</p>
        </div>
      )}

      {/* Weight modal */}
      {phase === "prompting" && (
        <WeightPrompt onConfirm={handleSave} onSkip={() => handleSave(null)} />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

function WeightPrompt({
  onConfirm,
  onSkip,
}: {
  onConfirm: (kg: number | null) => void
  onSkip: () => void
}) {
  const [value, setValue] = useState("")

  function handleConfirm() {
    const kg = parseFloat(value)
    onConfirm(isNaN(kg) || kg <= 0 ? null : kg)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">Analysis complete</p>
        <p className="text-xs text-gray-500 mt-0.5">Add weight to save the set</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="Leave blank for bodyweight"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSkip}
          className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Save & Upload
        </button>
      </div>
    </div>
  )
}
