import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy — Meridian",
  description: "How Meridian collects, uses, and protects your data.",
};

const LAST_UPDATED = "October 1, 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 space-y-1">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Meridian
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8">
        <Section title="Overview">
          <p>
            Meridian (&ldquo;the app,&rdquo; &ldquo;we&rdquo;) is a personal life-tracking application for habits,
            health, nutrition, budgeting, journaling, and related self-tracking features. This policy explains
            what data the app collects, how it&apos;s used, who it&apos;s shared with, and the choices you have
            over it.
          </p>
          <p>
            Meridian is operated as a personal project, not a company. If you&apos;re using an account on this
            app, the contact at the bottom of this page is who to reach for any privacy question or request.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>
            <strong className="text-foreground">Account information.</strong> Your email address and password
            (handled by our authentication provider, Supabase Auth — we never see or store your password in
            plain form).
          </p>
          <p>
            <strong className="text-foreground">Profile information.</strong> Display name, an icon you choose,
            date of birth, and gender — all optional, entered by you.
          </p>
          <p>
            <strong className="text-foreground">Activity and tracking data.</strong> Whatever you choose to log:
            habits and their completion history, journal entries, goals and milestones, budget and expense
            entries, nutrition and food logs, water/sleep/fasting/meditation/workout logs, carbon-footprint
            entries, calendar events and to-dos, and progress photos you upload.
          </p>
          <p>
            <strong className="text-foreground">Health and fitness data.</strong> If you connect a Fitbit or
            Pixel Watch account, we sync steps, heart rate, sleep, and calorie data from the Google Health API
            into your account. This is entirely opt-in — nothing is synced unless you explicitly connect it, and
            you can disconnect at any time in Settings.
          </p>
          <p>
            <strong className="text-foreground">Cycle tracking data.</strong> If you turn on cycle tracking (off
            by default), period, symptom, mood, and related entries you log are stored the same way as any other
            tracking data above — private to your account, never shared with other users.
          </p>
          <p>
            <strong className="text-foreground">AI Coach conversations.</strong> If you use the AI Coach feature,
            your messages and the relevant tracking data needed to answer them are sent to Google&apos;s Gemini
            API to generate a response. Conversation history is stored in your account so the AI Coach has
            context across messages.
          </p>
          <p>
            <strong className="text-foreground">Friend connections.</strong> If you add a friend by email, we
            look up whether an account exists for that email and, once accepted, share only the specific habits
            you&apos;ve explicitly marked as shared — never any other data.
          </p>
          <p>
            <strong className="text-foreground">Device and diagnostic data.</strong> If you enable push
            notifications, we store the browser-provided subscription details needed to deliver them. We also use
            automated error monitoring (Sentry) to catch bugs — this captures stack traces and the page/action
            that failed, not your tracking data or page content, and does not record screen replays.
          </p>
        </Section>

        <Section title="How we use your information">
          <p>
            Your data is used solely to provide the app&apos;s features to you: displaying your logs and trends,
            computing streaks and summaries, sending reminder notifications you&apos;ve opted into, generating AI
            Coach responses, and syncing health data from a connected device. We do not sell your data, and we do
            not use it for advertising.
          </p>
        </Section>

        <Section title="Third-party services we use">
          <p>The app relies on the following services to operate. Each only receives the data it needs to do its job:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-foreground">Supabase</strong> — database, authentication, and private file
              storage for progress photos.
            </li>
            <li>
              <strong className="text-foreground">Google Health API</strong> — only if you connect a Fitbit/Pixel
              Watch account, to pull in steps, heart rate, sleep, and calorie data.
            </li>
            <li>
              <strong className="text-foreground">Google Gemini API</strong> — only if you use the AI Coach, to
              generate responses to your messages.
            </li>
            <li>
              <strong className="text-foreground">Open Food Facts</strong> — food name searches when logging a
              meal, to look up nutrition facts for a product.
            </li>
            <li>
              <strong className="text-foreground">Climatiq</strong> — activity details (e.g. distance and mode of
              travel) when estimating a carbon-footprint entry&apos;s CO₂e, with no personal identifiers attached.
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — application hosting, plus anonymized,
              aggregate performance metrics (Speed Insights).
            </li>
            <li>
              <strong className="text-foreground">Sentry</strong> — error monitoring, as described above.
            </li>
            <li>
              <strong className="text-foreground">Web Push</strong> (a W3C browser standard, not a third-party
              company) — delivers notifications you&apos;ve opted into.
            </li>
          </ul>
        </Section>

        <Section title="Data storage and security">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Every table in our database enforces row-level security — your data is only ever readable by you (or, for the specific habits you mark shared, your accepted friends).</li>
            <li>All connections to the app are encrypted (HTTPS/TLS).</li>
            <li>Progress photos are stored in a private bucket; the app only ever generates short-lived, signed URLs to display them, never a public link.</li>
            <li>An optional app-lock PIN is salted and hashed before storage — we never store it in a readable form.</li>
            <li>OAuth tokens for connected services (like Google Health) are stored server-side and are never exposed to your browser.</li>
          </ul>
        </Section>

        <Section title="Data retention">
          <p>
            We keep your data for as long as your account exists. If you delete your account, every piece of
            data described above — habits, logs, journal entries, photos, health data, everything — is
            permanently deleted, generally within moments, with no recovery period.
          </p>
        </Section>

        <Section title="Your rights and choices">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-foreground">Export your data</strong> at any time from Analytics, as CSV or JSON.</li>
            <li><strong className="text-foreground">Delete your account</strong> at any time from Settings — this is permanent and immediate.</li>
            <li><strong className="text-foreground">Disconnect</strong> your Fitbit/Google Health connection at any time in Settings; previously synced data stays until you delete it or your account.</li>
            <li><strong className="text-foreground">Turn off cycle tracking</strong> at any time; it&apos;s opt-in to begin with.</li>
            <li><strong className="text-foreground">Opt out of push notifications</strong> at any time in Settings or your browser&apos;s notification permissions.</li>
          </ul>
        </Section>

        <Section title="Children's privacy">
          <p>
            Meridian is not directed at children, and we don&apos;t knowingly collect data from anyone under 13.
            If you believe a child has created an account, contact us and we&apos;ll delete it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes in a meaningful way, we&apos;ll update the &ldquo;Last updated&rdquo; date
            above. Continued use of the app after a change means you accept the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, concerns, or a request about your data not covered by the self-service options above:{" "}
            <a href="mailto:sssigmaxx@gmail.com" className="text-foreground underline underline-offset-2">
              sssigmaxx@gmail.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
