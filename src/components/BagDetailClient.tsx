"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IconAlert } from "@/components/icons";
import { StockDot } from "@/components/StockDot";
import { useToast } from "@/components/Toast";
import { formatEuro } from "@/lib/money";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number | null;
  note: string | null;
  createdAt: string;
  undoneAt: string | null;
  account: { name: string } | null;
};

type BagDetail = {
  id: string;
  name: string;
  photoPath: string | null;
  colorVariant: string | null;
  purchasePrice: number;
  targetPrice: number;
  quantityOnHand: number;
  lowStockThreshold: number;
  notes: string | null;
  listings: {
    id: string;
    quantity: number;
    account: { id: string; name: string; color: string };
  }[];
  movements: Movement[];
};

const typeLabel: Record<string, string> = {
  RECEPTION: "Réception",
  VENTE: "Vente",
  PERTE: "Perte",
  AJUSTEMENT: "Ajustement",
  MISE_EN_VENTE: "Mise en vente",
  RETRAIT_VENTE: "Retrait vente",
};

export function BagDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [bag, setBag] = useState<BagDetail | null>(null);
  const [alerts, setAlerts] = useState<
    { accountName: string; excess: number }[]
  >([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/bags/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setBag(data.bag);
    setAlerts(data.alerts || []);
    setName(data.bag.name);
    setPurchasePrice(String(data.bag.purchasePrice));
    setTargetPrice(String(data.bag.targetPrice));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const res = await fetch(`/api/bags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        purchasePrice: Number(purchasePrice.replace(",", ".")),
        targetPrice: Number(targetPrice.replace(",", ".")),
      }),
    });
    if (!res.ok) {
      showToast("Enregistrement impossible");
      return;
    }
    setEditing(false);
    showToast("Modifié");
    await load();
  }

  async function archive() {
    if (!confirm("Archiver ce sac ?")) return;
    const res = await fetch(`/api/bags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    if (!res.ok) {
      showToast("Archivage impossible");
      return;
    }
    router.push("/");
  }

  if (!bag) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton aspect-[4/3] w-full rounded-[var(--sr-radius-card)]" />
        <div className="skeleton h-10 w-1/2" />
        <div className="skeleton h-16 w-24" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/"
        className="focus-ring mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent"
      >
        ← Inventaire
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="mb-6 overflow-hidden rounded-[var(--sr-radius-card)] border border-border bg-surface shadow-[var(--sr-shadow-sm)] lg:mb-0">
          <div className="relative aspect-[4/3] bg-border lg:aspect-square">
            {bag.photoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/uploads/${bag.photoPath}`}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Pas de photo
              </div>
            )}
          </div>
        </div>

        <div>
          <header className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Fiche sac
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <StockDot
                quantity={bag.quantityOnHand}
                threshold={bag.lowStockThreshold}
              />
              <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                {bag.name}
              </h1>
            </div>
            {bag.colorVariant ? (
              <p className="mt-1 text-muted">{bag.colorVariant}</p>
            ) : null}
          </header>

          {alerts.length > 0 ? (
            <div className="mb-5 space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.accountName}
                  className="flex items-start gap-3 rounded-[var(--sr-radius-control)] border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
                >
                  <IconAlert size={18} className="mt-0.5 shrink-0" />
                  <span>
                    À retirer de la vente sur {a.accountName} ({a.excess} en
                    trop)
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <p className="font-display text-5xl font-black tabular-nums tracking-tight sm:text-6xl">
            {bag.quantityOnHand}
          </p>
          <p className="mt-1 text-sm text-muted">en stock</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--sr-radius-card)] border border-border bg-surface px-4 py-4 shadow-[var(--sr-shadow-sm)]">
              <p className="text-sm text-muted">Achat</p>
              <p className="mt-1 font-display text-xl font-black tabular-nums">
                {formatEuro(bag.purchasePrice)}
              </p>
            </div>
            <div className="rounded-[var(--sr-radius-card)] border border-border bg-surface px-4 py-4 shadow-[var(--sr-shadow-sm)]">
              <p className="text-sm text-muted">Prix visé</p>
              <p className="mt-1 font-display text-xl font-black tabular-nums">
                {formatEuro(bag.targetPrice)}
              </p>
            </div>
          </div>

          {editing ? (
            <div className="mt-6 space-y-3 rounded-[var(--sr-radius-card)] border border-border bg-surface p-4 shadow-[var(--sr-shadow-sm)]">
              <label className="block text-sm text-muted">
                Nom
                <input
                  className="focus-ring mt-1 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-muted">
                  Achat
                  <input
                    type="number"
                    step="0.01"
                    className="focus-ring mt-1 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </label>
                <label className="block text-sm text-muted">
                  Prix visé
                  <input
                    type="number"
                    step="0.01"
                    className="focus-ring mt-1 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="focus-ring min-h-12 flex-1 rounded-[var(--sr-radius-pill)] border border-border font-semibold text-muted"
                  onClick={() => setEditing(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="focus-ring min-h-12 flex-1 rounded-[var(--sr-radius-pill)] bg-brand font-bold text-brand-fg"
                  onClick={() => void save()}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="focus-ring min-h-12 flex-1 rounded-[var(--sr-radius-pill)] border border-border bg-surface font-semibold shadow-[var(--sr-shadow-sm)]"
                onClick={() => setEditing(true)}
              >
                Modifier
              </button>
              <button
                type="button"
                className="focus-ring min-h-12 flex-1 rounded-[var(--sr-radius-pill)] border border-danger/25 bg-danger-soft font-semibold text-danger"
                onClick={() => void archive()}
              >
                Archiver
              </button>
            </div>
          )}
        </div>
      </div>

      {bag.listings.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-black">En vente</h2>
          <ul className="space-y-2">
            {bag.listings.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-[var(--sr-radius-control)] border border-border bg-surface px-4 py-3 shadow-[var(--sr-shadow-sm)]"
              >
                <span className="flex items-center gap-2.5 font-semibold">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: l.account.color }}
                  />
                  {l.account.name}
                </span>
                <span className="font-display text-2xl font-black tabular-nums">
                  {l.quantity}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Mise en vente par compte : Phase 2
          </p>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 font-display text-xl font-black">Historique</h2>
        {bag.movements.length === 0 ? (
          <div className="rounded-[var(--sr-radius-card)] border border-dashed border-border bg-surface px-5 py-10 text-sm text-muted">
            Aucun mouvement pour l’instant.
          </div>
        ) : (
          <ul className="space-y-2">
            {bag.movements.map((m) => (
              <li
                key={m.id}
                className={`rounded-[var(--sr-radius-control)] border px-4 py-3 text-sm ${
                  m.undoneAt
                    ? "border-border/60 bg-background text-muted line-through"
                    : "border-border bg-surface shadow-[var(--sr-shadow-sm)]"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {typeLabel[m.type] || m.type} × {m.quantity}
                  </span>
                  <span className="shrink-0 text-muted">
                    {new Date(m.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-0.5 text-muted">
                  {[
                    m.account?.name,
                    m.unitPrice != null ? formatEuro(m.unitPrice) : null,
                    m.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
