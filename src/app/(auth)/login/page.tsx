"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Mail, Loader2, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setError("")

    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard",
    })

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.")
      setStatus("error")
    } else {
      setStatus("sent")
    }
  }

  if (status === "sent") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm">
            We sent a sign-in link to <span className="font-medium text-gray-700">{email}</span>.
            Click it to continue.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-6 text-sm text-emerald-600 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            mover<span className="text-emerald-600">AI</span>ght
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to track your workouts</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={status === "loading" || !email}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {status === "loading" ? "Sending…" : "Send magic link"}
          </Button>
        </form>

        <p className="text-xs text-gray-400 mt-6 text-center">
          No password needed. We&apos;ll email you a sign-in link.
        </p>
      </div>
    </div>
  )
}
