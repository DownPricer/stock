"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

type Account = {
  id: string;
  name: string;
  platform: string | null;
  color: string;
  commissionPercent: number | null;
  listings: { id: string; quantity: number; bag: { name: string } }[];
  _count: { movements: number };
};

const COLORS = [
  "#0b5d4e",
  "#c47a12",
  "#e8452c",
  "#10243a",
  "#1d4ed8",
  "#64748b",
];

export default function AccountsPage() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/accounts");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAccounts(data.accounts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        platform: platform.trim() || undefined,
        color,
      }),
    });
    if (!res.ok) {
      showToast("Création impossible");
      return;
    }
    setName("");
    setPlatform("");
    showToast("Compte créé");
    await load();
  }

  async function rename(id: string) {
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (!res.ok) {
      showToast("Renommage impossible");
      return;
    }
    setEditingId(null);
    showToast("Renommé");
    await load();
  }

  async function archive(id: string) {
    if (!confirm("Archiver ce compte ?")) return;
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    if (!res.ok) {
      showToast("Archivage impossible");
      return;
    }
    showToast("Compte archivé");
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Vente
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
            Comptes
          </h1>
          <p className="mt-2 text-muted">Tes plateformes de vente</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="focus-ring min-h-11 text-sm font-semibold text-muted underline underline-offset-2 hover:text-foreground"
        >
          Déconnexion
        </button>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <form
          onSubmit={onCreate}
          className="mb-8 space-y-4 rounded-[var(--sr-radius-card)] border border-border bg-surface p-5 shadow-[var(--sr-shadow-sm)] lg:mb-0"
        >
          <h2 className="font-display text-lg font-black">Ajouter un compte</h2>
          <label className="block text-sm font-medium text-muted">
            Nom
            <input
              required
              className="focus-ring mt-1.5 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3"
              placeholder="Vinted perso"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-muted">
            Plateforme (optionnel)
            <input
              className="focus-ring mt-1.5 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3"
              placeholder="Vinted, Leboncoin…"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Couleur</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Couleur ${c}`}
                  className={`focus-ring h-10 w-10 rounded-full transition-transform ${
                    color === c
                      ? "scale-110 ring-2 ring-brand ring-offset-2 ring-offset-surface"
                      : ""
                  }`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="focus-ring flex min-h-12 w-full items-center justify-center rounded-[var(--sr-radius-pill)] bg-brand font-bold text-brand-fg"
          >
            Ajouter
          </button>
        </form>

        <div>
          {loading ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="skeleton h-28 rounded-[var(--sr-radius-card)]"
                />
              ))}
            </ul>
          ) : accounts.length === 0 ? (
            <div className="rounded-[var(--sr-radius-card)] border border-dashed border-border bg-surface px-6 py-14">
              <h2 className="font-display text-2xl font-black">Aucun compte</h2>
              <p className="mt-2 max-w-md text-muted">
                Ajoute Vinted, Leboncoin ou un autre canal pour rattacher tes
                ventes.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {accounts.map((a) => {
                const listed = a.listings.reduce((s, l) => s + l.quantity, 0);
                return (
                  <li
                    key={a.id}
                    className="rounded-[var(--sr-radius-card)] border border-border bg-surface p-5 shadow-[var(--sr-shadow-sm)]"
                  >
                    <div className="mb-2 flex items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{ background: a.color }}
                      />
                      {editingId === a.id ? (
                        <input
                          className="focus-ring min-h-11 flex-1 rounded-[var(--sr-radius-control)] border border-border bg-background px-3"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        <h2 className="flex-1 font-display text-lg font-black">
                          {a.name}
                        </h2>
                      )}
                    </div>
                    {a.platform ? (
                      <p className="mb-2 text-sm text-muted">{a.platform}</p>
                    ) : null}
                    <p className="mb-3 text-sm text-muted">
                      <span className="font-semibold text-foreground">
                        {listed}
                      </span>{" "}
                      en vente ·{" "}
                      <span className="font-semibold text-foreground">
                        {a._count.movements}
                      </span>{" "}
                      vente{a._count.movements > 1 ? "s" : ""}
                    </p>
                    {a.listings.length > 0 ? (
                      <ul className="mb-4 space-y-1 text-sm text-muted">
                        {a.listings.map((l) => (
                          <li key={l.id}>
                            {l.bag.name} × {l.quantity}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="flex gap-2">
                      {editingId === a.id ? (
                        <button
                          type="button"
                          className="focus-ring min-h-11 flex-1 rounded-[var(--sr-radius-pill)] bg-brand text-sm font-bold text-brand-fg"
                          onClick={() => void rename(a.id)}
                        >
                          OK
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="focus-ring min-h-11 flex-1 rounded-[var(--sr-radius-pill)] border border-border bg-background text-sm font-semibold"
                          onClick={() => {
                            setEditingId(a.id);
                            setEditName(a.name);
                          }}
                        >
                          Renommer
                        </button>
                      )}
                      <button
                        type="button"
                        className="focus-ring min-h-11 flex-1 rounded-[var(--sr-radius-pill)] border border-danger/25 bg-danger-soft text-sm font-semibold text-danger"
                        onClick={() => void archive(a.id)}
                      >
                        Archiver
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
