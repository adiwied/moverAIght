"use client"

import { useState, useRef, useCallback } from "react"
import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Line, Text } from "@react-three/drei"
import type { NormalizedLandmark } from "@mediapipe/tasks-vision"
import type { ExerciseType } from "@/types"
import { PROCESS_FPS } from "@/utils/videoProcessor"

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
]

interface AngleDef {
  label: string
  left: [number, number, number]   // [a, b, c] — arc drawn here
  right?: [number, number, number] // if present, average both sides
  color: string
}

const EXERCISE_ANGLES: Record<ExerciseType, AngleDef[]> = {
  squat: [
    { label: "Knee", left: [23, 25, 27], right: [24, 26, 28], color: "#34d399" },
    { label: "Hip",  left: [11, 23, 25], right: [12, 24, 26], color: "#60a5fa" },
  ],
  pushup: [
    { label: "Elbow", left: [11, 13, 15], right: [12, 14, 16], color: "#34d399" },
    { label: "Body",  left: [11, 23, 27], right: [12, 24, 28], color: "#60a5fa" },
  ],
  plank: [
    { label: "Body", left: [11, 23, 27], right: [12, 24, 28], color: "#34d399" },
  ],
  lunge: [
    { label: "L Knee", left: [23, 25, 27], color: "#34d399" },
    { label: "R Knee", left: [24, 26, 28], color: "#60a5fa" },
  ],
}

const FLOOR_Y = -1

function buildPositions(landmarks: NormalizedLandmark[]): [number, number, number][] {
  const positions = landmarks.map((lm): [number, number, number] => [lm.x, -lm.y, -lm.z])
  const minY = Math.min(...positions.map(([, y]) => y))
  const offset = FLOOR_Y - minY
  return positions.map(([x, y, z]) => [x, y + offset, z])
}

function calcAngleDeg(
  posA: [number, number, number],
  posB: [number, number, number],
  posC: [number, number, number]
): number {
  const B = new THREE.Vector3(...posB)
  const vA = new THREE.Vector3(...posA).sub(B).normalize()
  const vC = new THREE.Vector3(...posC).sub(B).normalize()
  return THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, vA.dot(vC)))))
}

function generateArcPoints(
  posB: [number, number, number],
  posA: [number, number, number],
  posC: [number, number, number],
  radius: number,
  segments: number
): [number, number, number][] {
  const B = new THREE.Vector3(...posB)
  const vA = new THREE.Vector3(...posA).sub(B).normalize()
  const vC = new THREE.Vector3(...posC).sub(B).normalize()
  const theta = Math.acos(Math.max(-1, Math.min(1, vA.dot(vC))))
  const sinTheta = Math.sin(theta)

  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments
    let point: THREE.Vector3
    if (sinTheta < 0.001) {
      point = vA.clone().multiplyScalar(radius).add(B)
    } else {
      point = vA.clone()
        .multiplyScalar(Math.sin((1 - t) * theta) / sinTheta)
        .add(vC.clone().multiplyScalar(Math.sin(t * theta) / sinTheta))
        .multiplyScalar(radius)
        .add(B)
    }
    return [point.x, point.y, point.z] as [number, number, number]
  })
}

function AngleArcSide({
  positions,
  triplet,
  angle,
  label,
  color,
}: {
  positions: [number, number, number][]
  triplet: [number, number, number]
  angle: number
  label: string
  color: string
}) {
  const [ai, bi, ci] = triplet
  const posA = positions[ai], posB = positions[bi], posC = positions[ci]
  if (!posA || !posB || !posC) return null

  const arcPoints = generateArcPoints(posB, posA, posC, 0.1, 24)
  const mid = arcPoints[Math.floor(arcPoints.length / 2)]
  const B = new THREE.Vector3(...posB)
  const labelPos = new THREE.Vector3(...mid).sub(B).normalize().multiplyScalar(0.18).add(B)

  return (
    <>
      <Line points={arcPoints} color={color} lineWidth={2} />
      <Text
        position={[labelPos.x, labelPos.y, labelPos.z]}
        fontSize={0.055}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#000"
      >
        {`${label} ${Math.round(angle)}°`}
      </Text>
    </>
  )
}

function Skeleton({
  landmarks,
  exercise,
  showAngles,
}: {
  landmarks: NormalizedLandmark[]
  exercise: ExerciseType
  showAngles: boolean
}) {
  const positions = buildPositions(landmarks)
  const angleDefs = EXERCISE_ANGLES[exercise]

  return (
    <group>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>
      ))}
      {CONNECTIONS.map(([a, b], i) => {
        const posA = positions[a]
        const posB = positions[b]
        if (!posA || !posB) return null
        return <Line key={i} points={[posA, posB]} color="#34d399" lineWidth={2} />
      })}
      {showAngles && angleDefs.map((def, i) => {
        const [la, lb, lc] = def.left
        const lA = positions[la], lB = positions[lb], lC = positions[lc]
        const leftAngle = lA && lB && lC ? calcAngleDeg(lA, lB, lC) : null

        let displayAngle = leftAngle ?? 0
        if (def.right && leftAngle !== null) {
          const [ra, rb, rc] = def.right
          const rA = positions[ra], rB = positions[rb], rC = positions[rc]
          if (rA && rB && rC) displayAngle = (leftAngle + calcAngleDeg(rA, rB, rC)) / 2
        }

        return (
          <group key={i}>
            <AngleArcSide positions={positions} triplet={def.left} angle={displayAngle} label={def.label} color={def.color} />
            {def.right && (
              <AngleArcSide positions={positions} triplet={def.right} angle={displayAngle} label={def.label} color={def.color} />
            )}
          </group>
        )
      })}
    </group>
  )
}

function AnimationController({
  isPlaying,
  onAdvance,
}: {
  isPlaying: boolean
  onAdvance: (n: number) => void
}) {
  const accRef = useRef(0)
  useFrame((_, delta) => {
    if (!isPlaying) return
    accRef.current += delta * PROCESS_FPS
    const n = Math.floor(accRef.current)
    if (n > 0) {
      accRef.current -= n
      onAdvance(n)
    }
  })
  return null
}

interface Props {
  frames: (NormalizedLandmark[] | null)[]
  modelName: string
  exercise: ExerciseType
  onClose: () => void
}

export function SkeletonViewer({ frames, modelName, exercise, onClose }: Props) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showAngles, setShowAngles] = useState(true)
  const totalFrames = frames.length

  const advance = useCallback(
    (n: number) => {
      setCurrentFrame((f) => {
        const next = f + n
        if (next >= totalFrames) { setIsPlaying(false); return totalFrames - 1 }
        return next
      })
    },
    [totalFrames]
  )

  const landmarks = frames[currentFrame]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">{modelName}</span>
          <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded">3D Skeleton</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAngles((v) => !v)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              showAngles
                ? "border-emerald-500 text-emerald-400"
                : "border-gray-600 text-gray-500"
            }`}
          >
            Angles {showAngles ? "on" : "off"}
          </button>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 4, 3]} intensity={1} />
          <OrbitControls makeDefault />
          <gridHelper args={[4, 20, "#374151", "#1f2937"]} position={[0, -1, 0]} />
          <AnimationController isPlaying={isPlaying} onAdvance={advance} />
          {landmarks && (
            <Skeleton landmarks={landmarks} exercise={exercise} showAngles={showAngles} />
          )}
        </Canvas>

        <p className="absolute top-3 left-4 text-xs text-gray-600 pointer-events-none select-none">
          Drag to orbit · Scroll to zoom · Right-drag to pan
        </p>

        {!landmarks && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-600 text-sm">No pose detected in this frame</p>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center gap-4">
        <button
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full bg-white text-gray-900 hover:bg-gray-200 transition-colors"
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
          type="range"
          min={0}
          max={totalFrames - 1}
          step={1}
          value={currentFrame}
          onChange={(e) => { setIsPlaying(false); setCurrentFrame(parseInt(e.target.value)) }}
          className="flex-1 accent-emerald-500 cursor-pointer"
        />
        <span className="text-xs text-gray-500 tabular-nums w-20 text-right">
          {currentFrame + 1} / {totalFrames}
        </span>
      </div>
    </div>
  )
}
