import {
  ArrowRight,
  BellRing,
  CalendarClock,
  FileSpreadsheet,
  FolderKanban,
  Link2,
  ListChecks,
  Mail,
  MoonStar,
  Smartphone,
  Sun,
  Users,
} from "lucide-react";
import { Backdrop } from "@/components/Backdrop";
import { Footer } from "@/components/Footer";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Wordmark";
import "./home.css";

// TaskVault's public face. The app is private (no sign-up, noindex), so the
// "home page" a visitor sees is /login: the sign-in form sits in the hero and
// the rest of the page shows what the app does. Every workstream, task and name
// in the mock-ups below is made up and labelled as an example.

const MARQUEE = [
  "🛂 Passport renewal",
  "🚗 Car insurance",
  "🏠 Home lease",
  "🧾 Taxes",
  "🏥 Health insurance",
  "🎓 School forms",
  "🏢 Office setup",
  "✈️ Visa paperwork",
  "🔧 Home repairs",
  "💳 Card renewals",
];

type DemoTask = { title: string; ws: string; owner: string; prio: "high" | "med" | "low"; due: string };

const DEMO: { label: string; tone: "danger" | "warn" | "muted"; tasks: DemoTask[] }[] = [
  {
    label: "Overdue",
    tone: "danger",
    tasks: [{ title: "Upload renewal photos", ws: "Passport renewal", owner: "A", prio: "high", due: "Yesterday" }],
  },
  {
    label: "Due today",
    tone: "warn",
    tasks: [
      { title: "Compare three insurance quotes", ws: "Car insurance", owner: "P", prio: "high", due: "Today" },
      { title: "Email landlord about lease", ws: "Home lease", owner: "A", prio: "med", due: "Today" },
    ],
  },
  {
    label: "This week",
    tone: "muted",
    tasks: [
      { title: "Collect W-2s and 1099s", ws: "Taxes", owner: "P", prio: "med", due: "Fri" },
      { title: "Book biometrics slot", ws: "Visa paperwork", owner: "A", prio: "low", due: "Sun" },
    ],
  },
];

const TOASTS = [
  { stage: "Due in 7 days", title: "Renew car insurance", tone: "muted" },
  { stage: "Due tomorrow", title: "Submit school forms", tone: "warn" },
  { stage: "Due today", title: "Pay property tax", tone: "warn" },
  { stage: "Overdue", title: "Upload renewal photos", tone: "danger" },
] as const;

const STEPS = [
  {
    icon: FolderKanban,
    title: "Make a workstream",
    body: "One per piece of life admin: a passport renewal, the car insurance, the office. Each holds its own tasks, docs and next step.",
  },
  {
    icon: ListChecks,
    title: "Add tasks with deadlines",
    body: "Give each task a priority, a due date and an owner in the household, and link the Drive docs or sites it needs.",
  },
  {
    icon: BellRing,
    title: "Get reminded, then tick it off",
    body: "Email reminders arrive 7 days, 1 day and the day of a deadline, and again if it slips. The Today view shows what's next.",
  },
];

const FEATURES = [
  { icon: Sun, title: "Today view", body: "Overdue, due today and this week, across every workstream, on one screen." },
  { icon: CalendarClock, title: "Deadlines & priorities", body: "Every task has a due date and a priority, so the urgent things rise to the top." },
  { icon: Users, title: "Owners", body: "Shared with your household. Each task says whose it is." },
  { icon: Link2, title: "Linked docs", body: "Keep the Drive files, forms and portals each task needs one tap away." },
  { icon: ArrowRight, title: "Next steps", body: "Every workstream carries its next step, so picking it back up takes seconds." },
  { icon: Mail, title: "Daily digest", body: "One morning email: overdue, due today, the next 7 days and next steps. Off in Settings if you prefer." },
  { icon: FileSpreadsheet, title: "Spreadsheet import", body: "Bring an old tracking sheet across in one go with CSV import." },
  { icon: Smartphone, title: "Installs on your phone", body: "Add it to your home screen and it opens like an app." },
];

const STAGES = [
  { when: "7 days before", note: "A heads-up while there's still time", tone: "muted" },
  { when: "1 day before", note: "Tomorrow's deadline, today", tone: "warn" },
  { when: "On the day", note: "Due today", tone: "warn" },
  { when: "Overdue", note: "If it slips, you'll hear once more", tone: "danger" },
] as const;

function Dot({ prio }: { prio: DemoTask["prio"] }) {
  return <span aria-hidden className={`tk-dot tk-dot-${prio}`} />;
}

function PhoneDemo() {
  let i = 0;
  return (
    <div className="tk-stage" aria-hidden>
      <div className="tk-float tk-float-a">
        <span className="tk-float-kicker">Next step</span>
        <span>Book biometrics slot</span>
      </div>
      <div className="tk-float tk-float-b">
        <span className="tk-float-kicker">
          <Link2 className="inline size-3" /> Linked doc
        </span>
        <span>insurance-quotes.pdf</span>
      </div>

      <div className="tk-phone">
        <div className="tk-notch" />
        <div className="tk-screen">
          <div className="tk-screen-head">
            <div>
              <p className="tk-hello">Good morning</p>
              <p className="tk-sub">5 things need you this week</p>
            </div>
            <span className="tk-example">Example</span>
          </div>

          <div className="tk-progress">
            <span />
          </div>

          {DEMO.map((group) => (
            <div key={group.label} className="tk-group">
              <p className={`tk-group-label tk-tone-${group.tone}`}>{group.label}</p>
              {group.tasks.map((t) => {
                const n = i++;
                return (
                  <div key={t.title} className="tk-task" style={{ "--n": n } as React.CSSProperties}>
                    <span className="tk-check">
                      <svg viewBox="0 0 16 16" className="tk-tick">
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="tk-task-title">
                        <Dot prio={t.prio} />
                        {t.title}
                      </span>
                      <span className="tk-task-meta">
                        <span className="tk-chip">{t.ws}</span>
                        <span className={`tk-due tk-tone-${group.tone}`}>{t.due}</span>
                      </span>
                    </span>
                    <span className="tk-avatar">{t.owner}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="tk-toasts">
          {TOASTS.map((t, k) => (
            <div key={t.stage} className="tk-toast" style={{ "--k": k } as React.CSSProperties}>
              <span className={`tk-toast-icon tk-tone-${t.tone}`}>
                <Mail className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className={`tk-toast-stage tk-tone-${t.tone}`}>Reminder · {t.stage}</span>
                <span className="tk-toast-title">{t.title}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Backdrop />

      <header className="px-4 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Logo href="/login" />
          <a href="#sign-in" className="hidden min-h-11 items-center text-sm text-amber-300 hover:underline sm:inline-flex">
            Sign in
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- Hero: sign-in + the Today view at work ---------- */}
        <section className="px-4 pt-8 pb-14 sm:px-6 sm:pt-14 lg:pb-20">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
            <div className="tk-rise">
              <p className="tk-kicker">
                <span className="tk-pulse" /> Private · for your household
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Life admin, <span className="tk-shimmer">handled</span>{" "}before it&apos;s due.
              </h1>
              <p className="mt-4 max-w-xl text-base text-zinc-400 sm:text-lg">
                A private household tracker for life admin: workstreams, deadlines, docs and reminders.
              </p>

              <div
                id="sign-in"
                className="tk-card mt-8 w-full max-w-md scroll-mt-6 rounded-xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-md sm:p-6"
              >
                <LoginForm />
              </div>
            </div>

            <PhoneDemo />
          </div>
        </section>

        {/* ---------- Marquee of example workstreams ---------- */}
        <section aria-label="Example workstreams" className="border-y border-white/10 bg-white/[0.02] py-4">
          <div className="tk-marquee overflow-hidden">
            <div className="tk-marquee-track">
              {[...MARQUEE, ...MARQUEE].map((m, k) => (
                <span key={k} aria-hidden={k >= MARQUEE.length} className="tk-marquee-item">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <p className="tk-eyebrow">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">From scattered sheets to one list.</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, k) => (
                <li key={s.title} className="tk-step rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3">
                    <span className="tk-step-num">{k + 1}</span>
                    <s.icon className="size-5 text-amber-300" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Reminder timeline ---------- */}
        <section className="px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto w-full max-w-6xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="tk-eyebrow">Reminders</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">Nothing sneaks up on you.</h2>
                <p className="mt-3 text-zinc-400">
                  Each deadline gets up to four emails, timed to your own time zone.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300">
                  <MoonStar className="size-4 text-violet-300" aria-hidden />
                  Quiet hours: never between 10 pm and 7 am
                </p>
              </div>
              <ol className="tk-timeline">
                {STAGES.map((s, k) => (
                  <li key={s.when} className="tk-tl-item" style={{ "--k": k } as React.CSSProperties}>
                    <span className={`tk-tl-dot tk-tone-${s.tone}`} />
                    <span>
                      <span className={`block font-medium tk-tone-${s.tone}`}>{s.when}</span>
                      <span className="block text-sm text-zinc-400">{s.note}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto w-full max-w-6xl">
            <p className="tk-eyebrow">What&apos;s inside</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Everything a household juggles.</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="tk-feature rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <span className="tk-feature-icon">
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-zinc-400">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="tk-cta mx-auto w-full max-w-4xl rounded-2xl border border-amber-400/30 p-8 text-center sm:p-12">
            <h2 className="text-3xl font-semibold tracking-tight">Your household&apos;s life admin, in one place.</h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              TaskVault is private and invite-only: there&apos;s no public sign-up.
            </p>
            <a
              href="#sign-in"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-amber-400 px-6 font-medium text-zinc-950 hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
            >
              Sign in <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
