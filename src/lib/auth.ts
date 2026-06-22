import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { db } from "@/db"
import * as schema from "@/db/schema"

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
          to: email,
          subject: "Sign in to moverAIght",
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
              <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin-bottom: 8px;">Sign in to moverAIght</h1>
              <p style="color: #6b7280; margin-bottom: 32px;">Click the button below to sign in. This link expires in 10 minutes.</p>
              <a href="${url}" style="display: inline-block; background: #059669; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Sign in
              </a>
              <p style="color: #9ca3af; font-size: 13px; margin-top: 32px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
          `,
        })
      },
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
