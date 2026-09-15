import { useState, type ReactNode } from 'react';
import { Check, Coffee, Copy, ExternalLink, Heart, Mail, Music2, Send } from 'lucide-react';

const TELEBIRR_NUMBER = '251911573334';
const TELEBIRR_LOGO_URL = 'https://raw.githubusercontent.com/gracejosh/grace-book-fixes/d34d4ead7fd915dfcc16b9a8d8557e879488e309/telebirr.png';

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
    >
      {children}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

export default function Donate() {
  const [copied, setCopied] = useState(false);

  const copyTelebirrNumber = async () => {
    try {
      await navigator.clipboard.writeText(TELEBIRR_NUMBER);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-primary-50 via-white to-gold-50/60 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-gold-500 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gold-300/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Heart className="h-4 w-4 fill-current" /> Support Grace Book
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Support Grace Book</h1>
            <p className="mt-3 text-lg font-semibold text-white/90 sm:text-xl">Support to grow the service</p>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              Grace Book is free for everyone. Your support helps us keep Bible verses, books, courses, and community features accessible to all. Every contribution makes a difference.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-3xl border border-primary-100 bg-white p-6 shadow-lg shadow-primary-100/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-2 dark:bg-slate-700">
                <img src={TELEBIRR_LOGO_URL} alt="Telebirr logo" className="h-full w-full object-contain" loading="lazy" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-600 dark:text-primary-300">Telebirr</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Send via Telebirr</h2>
              </div>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-600 dark:text-slate-300">Use this number in Telebirr to send your contribution.</p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary-50 p-3 dark:bg-slate-700">
              <span className="font-mono text-base font-bold tracking-wide text-slate-900 dark:text-white">{TELEBIRR_NUMBER}</span>
              <button
                type="button"
                onClick={copyTelebirrNumber}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-600"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-sky-100 bg-white p-6 shadow-lg shadow-sky-100/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"><Send className="h-6 w-6" /></div>
            <p className="mt-5 text-sm font-semibold text-sky-700 dark:text-sky-300">Telegram Group</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Join our community</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Connect with the Grace Book community and stay encouraged.</p>
            <div className="mt-5"><ActionLink href="https://t.me/graceapp">Open Telegram</ActionLink></div>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><Mail className="h-6 w-6" /></div>
            <p className="mt-5 text-sm font-semibold text-rose-700 dark:text-rose-300">Email</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Reach us directly</h2>
            <p className="mt-3 break-all text-sm leading-6 text-slate-600 dark:text-slate-300">graceapp@proton.me</p>
            <div className="mt-5"><ActionLink href="mailto:graceapp@proton.me">Send Email</ActionLink></div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-white"><Music2 className="h-6 w-6" /></div>
            <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">TikTok</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Follow us for updates</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Find encouragement, updates, and Grace Book moments.</p>
            <div className="mt-5"><ActionLink href="https://www.tiktok.com/@graceapp">Follow on TikTok</ActionLink></div>
          </article>

          <article className="rounded-3xl border border-dashed border-gold-300 bg-gold-50/70 p-6 shadow-lg shadow-gold-100/50 dark:border-gold-700 dark:bg-gold-900/10 dark:shadow-none lg:col-span-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300"><Coffee className="h-6 w-6" /></div>
            <p className="mt-5 text-sm font-semibold text-gold-700 dark:text-gold-300">Coming soon</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Buy Me a Coffee</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">A simple coffee-support option is being prepared. For now, Telebirr is the best way to support Grace Book.</p>
            <button type="button" disabled className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gold-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-gold-700 opacity-70 dark:border-gold-700 dark:bg-slate-800/60 dark:text-gold-300">Coffee option coming soon</button>
          </article>
        </section>

        <p className="mt-10 text-center text-sm font-medium text-slate-500 dark:text-slate-400">Thank you for your support · Grace Book</p>
      </div>
    </div>
  );
}
