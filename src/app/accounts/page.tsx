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

const COLORS = ["#0f766e", "#b45309", "#be123c", "#1d4ed8", "#7c3aed", "#64748b"];

export default function AccountsPage() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/accounts");
    if (!res.ok) return;
    const data = await res.json();
    setAccounts(data.accounts);
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
    <main className="px-4 pt-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comptes</h1>
          <p className="text-sm text-zinc-500">Tes plateformes de vente</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-11 text-sm text-zinc-500 underline"
        >
          Déconnexion
        </button>
      </div>

      <form
        onSubmit={onCreate}
        className="mb-6 space-y-3 rounded-2xl bg-white p-4 dark:bg-zinc-900"
      >
        <label className="block text-sm">
          Nom
          <input
            required
            className="mt-1 min-h-12 w-full rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Vinted perso"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Plateforme (optionnel)
          <input
            className="mt-1 min-h-12 w-full rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Vinted, Leboncoin…"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Couleur ${c}`}
              className={`h-10 w-10 rounded-full ${
                color === c ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white" : ""
              }`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-teal-700 font-semibold text-white"
        >
          Ajouter
        </button>
      </form>

      <ul className="space-y-3">
        {accounts.map((a) => {
          const listed = a.listings.reduce((s, l) => s + l.quantity, 0);
          return (
            <li
              key={a.id}
              className="rounded-2xl bg-white p-4 dark:bg-zinc-900"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: a.color }}
                />
                {editingId === a.id ? (
                  <input
                    className="min-h-11 flex-1 rounded-xl border border-zinc-200 px-2 dark:border-zinc-700 dark:bg-zinc-950"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  <h2 className="flex-1 font-semibold">{a.name}</h2>
                )}
              </div>
              {a.platform ? (
                <p className="mb-2 text-sm text-zinc-500">{a.platform}</p>
              ) : null}
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
                {listed} en vente · {a._count.movements} vente
                {a._count.movements > 1 ? "s" : ""}
              </p>
              {a.listings.length > 0 ? (
                <ul className="mb-3 space-y-1 text-sm text-zinc-500">
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
                    className="min-h-11 flex-1 rounded-xl bg-teal-700 text-sm font-medium text-white"
                    onClick={() => void rename(a.id)}
                  >
                    OK
                  </button>
                ) : (
                  <button
                    type="button"
                    className="min-h-11 flex-1 rounded-xl bg-zinc-100 text-sm font-medium dark:bg-zinc-800"
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
                  className="min-h-11 flex-1 rounded-xl bg-rose-50 text-sm font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-200"
                  onClick={() => void archive(a.id)}
                >
                  Archiver
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
