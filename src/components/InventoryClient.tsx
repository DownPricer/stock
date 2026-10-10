"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BagCard, type BagCardData } from "@/components/BagCard";
import { IconAlert, IconPlus, IconSearch } from "@/components/icons";
import { QtyPrompt } from "@/components/QtyPrompt";
import { SaleSheet, type AccountOption } from "@/components/SaleSheet";
import { useToast } from "@/components/Toast";
import { formatEuro } from "@/lib/money";
import { computeOverlistingAlerts } from "@/lib/stock";

const LAST_ACCOUNT_KEY = "stock_last_account";

type Filter = "all" | "low" | "out";

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[var(--sr-radius-card)] border border-border bg-surface"
        >
          <div className="skeleton aspect-square" />
          <div className="space-y-3 p-4">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-10 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InventoryClient() {
  const { showToast } = useToast();
  const router = useRouter();

  const [bags, setBags] = useState<BagCardData[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [monthSales, setMonthSales] = useState(0);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [saleBag, setSaleBag] = useState<BagCardData | null>(null);
  const [qtyBag, setQtyBag] = useState<BagCardData | null>(null);
  const [lastAccountId, setLastAccountId] = useState<string | null>(null);
  const [panelBag, setPanelBag] = useState<BagCardData | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter !== "all") params.set("filter", filter);
    const [bagsRes, accountsRes, statsRes] = await Promise.all([
      fetch(`/api/bags?${params}`),
      fetch("/api/accounts"),
      fetch("/api/stats/summary"),
    ]);
    if (bagsRes.ok) {
      const data = await bagsRes.json();
      setBags(data.bags);
    }
    if (accountsRes.ok) {
      const data = await accountsRes.json();
      setAccounts(
        data.accounts.map((a: AccountOption) => ({
          id: a.id,
          name: a.name,
          color: a.color,
        })),
      );
    }
    if (statsRes.ok) {
      const data = await statsRes.json();
      setMonthSales(data.monthSalesTotal ?? 0);
    }
    setLoading(false);
  }, [q, filter]);

  useEffect(() => {
    setLastAccountId(localStorage.getItem(LAST_ACCOUNT_KEY));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 120);
    return () => clearTimeout(t);
  }, [load]);

  const stats = useMemo(() => {
    const units = bags.reduce((s, b) => s + b.quantityOnHand, 0);
    const value = bags.reduce(
      (s, b) => s + b.quantityOnHand * (b.purchasePrice ?? 0),
      0,
    );
    return { units, value, monthSales };
  }, [bags, monthSales]);

  const alerts = useMemo(() => {
    const items: { key: string; text: string }[] = [];
    for (const b of bags) {
      if (b.quantityOnHand <= 0) {
        items.push({ key: `out-${b.id}`, text: `Rupture : ${b.name}` });
      }
      const over = computeOverlistingAlerts(
        b.id,
        b.quantityOnHand,
        (b.listings || []).map((l) => ({
          accountId: l.account.id,
          accountName: l.account.name,
          quantity: l.quantity,
        })),
      );
      for (const a of over) {
        items.push({
          key: `over-${b.id}-${a.accountId}`,
          text: `À retirer de la vente sur ${a.accountName} — ${b.name}`,
        });
      }
    }
    return items;
  }, [bags]);

  const filters = useMemo(
    () =>
      [
        { id: "all" as const, label: "Tout" },
        { id: "low" as const, label: "Stock bas" },
        { id: "out" as const, label: "Rupture" },
      ] as const,
    [],
  );

  async function postMovement(body: Record<string, unknown>) {
    const res = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Échec");
    return data.movement as { id: string };
  }

  async function undo(movementId: string) {
    const res = await fetch(`/api/movements/${movementId}/undo`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Annulation impossible");
    }
    await load();
  }

  function optimisticQty(bagId: string, delta: number) {
    setBags((prev) =>
      prev.map((b) =>
        b.id === bagId
          ? { ...b, quantityOnHand: Math.max(0, b.quantityOnHand + delta) }
          : b,
      ),
    );
  }

  async function receive(bag: BagCardData, quantity: number) {
    optimisticQty(bag.id, quantity);
    try {
      const movement = await postMovement({
        type: "RECEPTION",
        bagId: bag.id,
        quantity,
      });
      showToast(`+${quantity} reçu`, {
        label: "Annuler",
        onClick: () => undo(movement.id),
      });
      await load();
    } catch (e) {
      await load();
      showToast(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function sell(accountId: string, unitPrice: number) {
    if (!saleBag) return;
    const bag = saleBag;
    setSaleBag(null);
    localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
    setLastAccountId(accountId);
    optimisticQty(bag.id, -1);
    try {
      const movement = await postMovement({
        type: "VENTE",
        bagId: bag.id,
        accountId,
        quantity: 1,
        unitPrice,
      });
      showToast("Vente enregistrée", {
        label: "Annuler",
        onClick: () => undo(movement.id),
      });
      await load();
    } catch (e) {
      await load();
      showToast(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function other(kind: "PERTE" | "AJUSTEMENT", note: string) {
    if (!saleBag) return;
    const bag = saleBag;
    setSaleBag(null);
    optimisticQty(bag.id, -1);
    try {
      const movement = await postMovement({
        type: kind,
        bagId: bag.id,
        quantity: kind === "AJUSTEMENT" ? -1 : 1,
        note: note || (kind === "PERTE" ? "Perte / cadeau" : "Correction"),
      });
      showToast("Stock mis à jour", {
        label: "Annuler",
        onClick: () => undo(movement.id),
      });
      await load();
    } catch (e) {
      await load();
      showToast(e instanceof Error ? e.message : "Erreur");
    }
  }

  function openBag(bag: BagCardData) {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setPanelBag(bag);
      return;
    }
    router.push(`/bags/${bag.id}`);
  }

  return (
    <div className="relative">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Inventaire
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
            Tes sacs
          </h1>
        </div>
        <Link
          href="/bags/new"
          className="focus-ring inline-flex min-h-[var(--sr-tap)] items-center gap-2 rounded-[var(--sr-radius-pill)] bg-brand px-5 text-sm font-bold text-brand-fg shadow-[var(--sr-shadow-sm)]"
        >
          <IconPlus size={18} />
          Nouveau sac
        </Link>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:mb-6">
        {[
          { label: "Sacs en stock", value: String(stats.units) },
          { label: "Valeur du stock", value: formatEuro(stats.value) },
          { label: "Ventes du mois", value: formatEuro(stats.monthSales) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[var(--sr-radius-card)] border border-border bg-surface px-5 py-4 shadow-[var(--sr-shadow-sm)]"
          >
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums tracking-tight sm:text-[1.75rem]">
              {loading ? "—" : s.value}
            </p>
          </div>
        ))}
      </section>

      {alerts.length > 0 ? (
        <section className="mb-5 space-y-2 lg:mb-6">
          {alerts.slice(0, 6).map((a) => (
            <div
              key={a.key}
              className="flex items-start gap-3 rounded-[var(--sr-radius-control)] border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              <IconAlert size={18} className="mt-0.5 shrink-0" />
              <span>{a.text}</span>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <IconSearch
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            placeholder="Rechercher…"
            className="focus-ring min-h-12 w-full rounded-[var(--sr-radius-pill)] border border-border bg-surface py-2 pl-11 pr-4 shadow-[var(--sr-shadow-sm)]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`focus-ring min-h-11 shrink-0 rounded-[var(--sr-radius-pill)] px-4 text-sm font-semibold ${
                filter === f.id
                  ? "bg-night text-cream dark:bg-cream dark:text-night"
                  : "border border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : bags.length === 0 ? (
        <div className="flex flex-col items-start rounded-[var(--sr-radius-card)] border border-dashed border-border bg-surface px-6 py-16 sm:px-10">
          <h2 className="font-display text-2xl font-black">Aucun sac</h2>
          <p className="mt-2 max-w-md text-muted">
            Ajoute ton premier sac pour suivre le stock en deux taps.
          </p>
          <Link
            href="/bags/new"
            className="focus-ring mt-6 inline-flex min-h-[var(--sr-tap)] items-center gap-2 rounded-[var(--sr-radius-pill)] bg-brand px-5 font-bold text-brand-fg"
          >
            <IconPlus size={18} />
            Ajouter mon premier sac
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {bags.map((bag) => (
            <BagCard
              key={bag.id}
              bag={bag}
              onOpen={() => openBag(bag)}
              onPlus={() => void receive(bag, 1)}
              onPlusLong={() => setQtyBag(bag)}
              onMinus={() => {
                if (bag.quantityOnHand <= 0) {
                  showToast("Stock déjà à 0");
                  return;
                }
                setSaleBag(bag);
              }}
            />
          ))}
        </div>
      )}

      <SaleSheet
        open={Boolean(saleBag)}
        bagName={saleBag?.name || ""}
        targetPrice={saleBag?.targetPrice || 0}
        accounts={accounts}
        lastAccountId={lastAccountId}
        onClose={() => setSaleBag(null)}
        onSell={(accountId, unitPrice) => void sell(accountId, unitPrice)}
        onOther={(kind, note) => void other(kind, note)}
      />

      <QtyPrompt
        open={Boolean(qtyBag)}
        title={`Réception — ${qtyBag?.name || ""}`}
        onClose={() => setQtyBag(null)}
        onConfirm={(qty) => {
          if (qtyBag) void receive(qtyBag, qty);
          setQtyBag(null);
        }}
      />

      {panelBag ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[var(--sr-overlay)]"
            aria-label="Fermer"
            onClick={() => setPanelBag(null)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[var(--sr-panel-w)] flex-col border-l border-border bg-surface shadow-[var(--sr-shadow)]"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-xl font-black">{panelBag.name}</h2>
              <button
                type="button"
                className="focus-ring min-h-11 rounded-[var(--sr-radius-pill)] px-3 font-semibold text-muted hover:text-foreground"
                onClick={() => setPanelBag(null)}
              >
                Fermer
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="relative mb-5 aspect-square overflow-hidden rounded-[var(--sr-radius-card)] bg-border">
                {panelBag.photoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${panelBag.photoPath}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted">
                    Pas de photo
                  </div>
                )}
              </div>
              <p className="font-display text-5xl font-black tabular-nums">
                {panelBag.quantityOnHand}
              </p>
              <p className="mt-2 text-muted">
                Achat {formatEuro(panelBag.purchasePrice ?? 0)} · Visé{" "}
                {formatEuro(panelBag.targetPrice)}
              </p>
              <Link
                href={`/bags/${panelBag.id}`}
                className="focus-ring mt-6 inline-flex min-h-12 items-center rounded-[var(--sr-radius-pill)] bg-night px-5 font-bold text-cream dark:bg-cream dark:text-night"
              >
                Ouvrir la fiche
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
