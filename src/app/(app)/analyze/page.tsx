"use client"

import { useState } from "react"
import { AnalyzeClient } from "./AnalyzeClient"
import { UploadAnalyzeClient } from "./UploadAnalyzeClient"

type Tab = "live" | "upload"

export default function AnalyzePage() {
  const [tab, setTab] = useState<Tab>("live")

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["live", "upload"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "live" ? "Live" : "Upload Video"}
          </button>
        ))}
      </div>

      {tab === "live" ? <AnalyzeClient /> : <UploadAnalyzeClient />}
    </div>
  )
}
