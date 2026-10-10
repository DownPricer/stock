"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { SiteReadyCredit, SiteReadyMark } from "@/components/brand/SiteReadyMark";
import {
  IconEye,
  IconEyeOff,
  IconLoader,
  IconMoon,
  IconSun,
} from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { theme, toggle } = useTheme();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Connexion impossible");
        return;
      }
      const next = search.get("next") || "/";
      router.replace(next);
      window.location.href = next;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-background lg:grid lg:grid-cols-2">
      <button
        type="button"
        onClick={toggle}
        className="focus-ring absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface lg:right-6 lg:top-6"
        aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
      >
        {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
      </button>

      {/* Colonne gauche — présentation (PC) */}
      <section className="relative hidden min-h-dvh overflow-hidden bg-night text-cream lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20 xl:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--sr-yellow) 0, transparent 42%), radial-gradient(circle at 80% 70%, var(--sr-green) 0, transparent 40%)",
          }}
        />
        <div className="pointer-events-none absolute -right-10 top-8 select-none font-display text-[12rem] font-black leading-none text-brand/15 xl:text-[14rem]">
          07
        </div>

        <SiteReadyMark tone="onDark" size={36} />

        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">
            Stock
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-cream/85">
            Ton inventaire de sacs, clair et rapide — réception, vente et
            comptes au même endroit.
          </p>

          <div className="mt-12 max-w-md rounded-[var(--sr-radius-card)] border border-cream/10 bg-cream/[0.06] p-5 shadow-[var(--sr-shadow)] backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between text-[0.7rem] font-bold uppercase tracking-[0.14em] text-cream/55">
              <span>Aperçu</span>
              <span>Inventaire</span>
            </div>
            <ul className="space-y-2.5">
              {[
                { name: "Cabas cognac", qty: 4, tone: "ok" as const },
                { name: "Mini beige", qty: 1, tone: "warn" as const },
                { name: "Pochette rouge", qty: 0, tone: "danger" as const },
              ].map((row) => (
                <li
                  key={row.name}
                  className="flex items-center gap-3 rounded-[var(--sr-radius-control)] bg-cream px-4 py-3 text-night"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      row.tone === "ok"
                        ? "bg-ok"
                        : row.tone === "warn"
                          ? "bg-warn"
                          : "bg-danger"
                    }`}
                  />
                  <span className="flex-1 text-sm font-semibold">{row.name}</span>
                  <span className="font-display text-xl font-black tabular-nums">
                    {row.qty}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <SiteReadyCredit tone="onDark" className="relative z-10" />
      </section>

      {/* Colonne droite — formulaire */}
      <section className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-[24rem]">
          <div className="mb-8 lg:hidden">
            <SiteReadyMark size={32} />
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Connexion
          </p>
          <h2 className="font-display text-[1.85rem] font-black leading-tight tracking-tight sm:text-4xl">
            Accède à ton stock
          </h2>
          <p className="mt-2 text-muted">
            Espace personnel protégé par mot de passe.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-muted">
              Mot de passe
              <div className="relative mt-1.5">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-ring min-h-[var(--sr-tap)] w-full rounded-[var(--sr-radius-control)] border border-border bg-surface px-4 pr-12 text-base text-foreground shadow-[var(--sr-shadow-sm)]"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="focus-ring absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-foreground"
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </label>

            {error ? (
              <p
                role="alert"
                className="rounded-[var(--sr-radius-control)] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring flex min-h-[var(--sr-tap)] w-full items-center justify-center gap-2 rounded-[var(--sr-radius-pill)] bg-brand text-base font-bold text-brand-fg shadow-[var(--sr-shadow-sm)] transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <IconLoader size={18} /> Connexion…
                </>
              ) : (
                "Entrer"
              )}
            </button>
          </form>

          <div className="mt-10 border-t border-border pt-6 lg:hidden">
            <SiteReadyCredit />
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-brand lg:hidden" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-muted">
          Chargement…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
