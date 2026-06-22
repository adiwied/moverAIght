"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"

export function Navbar() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-sm font-semibold text-gray-900">
          moverAIght
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/analyze" className="text-sm text-gray-500 hover:text-gray-900">
            Analyze
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
