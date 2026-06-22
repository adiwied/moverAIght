"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface DataPoint {
  date: string
  score: number
  exercise: string
}

interface Props {
  data: DataPoint[]
}

export function ProgressChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Form Score Over Time</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
            formatter={(value, _, entry) => [
              `${value ?? ""}`,
              (entry as { payload?: { exercise?: string } }).payload?.exercise ?? "",
            ]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
