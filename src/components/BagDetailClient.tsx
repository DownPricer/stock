"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
    return <main className="p-4 text-zinc-500">Chargement…</main>;
  }

  return (
    <main className="px-4 pt-4">
      <Link
        href="/"
        className="mb-3 inline-flex min-h-11 items-center text-sm text-teal-700 dark:text-teal-300"
      >
        ← Inventaire
      </Link>

      <div className="mb-4 aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        {bag.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/uploads/${bag.photoPath}`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            Pas de photo
          </div>
        )}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <StockDot
          quantity={bag.quantityOnHand}
          threshold={bag.lowStockThreshold}
        />
        <h1 className="text-2xl font-bold tracking-tight">{bag.name}</h1>
      </div>

      {alerts.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {alerts.map((a) => (
            <p key={a.accountName}>
              À retirer de la vente sur {a.accountName} ({a.excess} en trop)
            </p>
          ))}
        </div>
      ) : null}

      <p className="mb-4 text-5xl font-bold tabular-nums">{bag.quantityOnHand}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white p-3 dark:bg-zinc-900">
          <p className="text-zinc-500">Achat</p>
          <p className="text-lg font-semibold">
            {formatEuro(bag.purchasePrice)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 dark:bg-zinc-900">
          <p className="text-zinc-500">Prix visé</p>
          <p className="text-lg font-semibold">{formatEuro(bag.targetPrice)}</p>
        </div>
      </div>

      {bag.listings.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 font-semibold">En vente</h2>
          <ul className="space-y-2">
            {bag.listings.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-3 dark:bg-zinc-900"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: l.account.color }}
                  />
                  {l.account.name}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {l.quantity}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">
            Mise en vente par compte : Phase 2
          </p>
        </section>
      ) : null}

      {editing ? (
        <div className="mb-6 space-y-3">
          <input
            className="min-h-12 w-full rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              className="min-h-12 rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-900"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              className="min-h-12 rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-900"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="min-h-12 w-full rounded-2xl bg-teal-700 font-semibold text-white"
            onClick={() => void save()}
          >
            Enregistrer
          </button>
        </div>
      ) : (
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            className="min-h-12 flex-1 rounded-2xl bg-zinc-100 font-medium dark:bg-zinc-800"
            onClick={() => setEditing(true)}
          >
            Modifier
          </button>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-2xl bg-rose-50 font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-200"
            onClick={() => void archive()}
          >
            Archiver
          </button>
        </div>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Historique</h2>
        <ul className="space-y-2">
          {bag.movements.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl px-3 py-3 text-sm ${
                m.undoneAt
                  ? "bg-zinc-50 text-zinc-400 line-through dark:bg-zinc-900/50"
                  : "bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">
                  {typeLabel[m.type] || m.type} × {m.quantity}
                </span>
                <span className="text-zinc-500">
                  {new Date(m.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-zinc-500">
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
      </section>
    </main>
  );
}
