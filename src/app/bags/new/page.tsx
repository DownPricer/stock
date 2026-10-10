"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { IconPlus } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { compressImage } from "@/lib/compress-image";

export default function NewBagPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  async function onPhotoChange(file: File | null) {
    if (!file) {
      setPreview(null);
      setPhotoBlob(null);
      return;
    }
    const blob = await compressImage(file);
    setPhotoBlob(blob);
    setPreview(URL.createObjectURL(blob));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("quantity", quantity);
      form.set("purchasePrice", purchasePrice.replace(",", "."));
      form.set("targetPrice", targetPrice.replace(",", "."));
      if (photoBlob) {
        form.set("photo", photoBlob, "photo.jpg");
      }

      const res = await fetch("/api/bags", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Création impossible");
        return;
      }
      showToast("Sac ajouté");
      router.push(`/bags/${data.bag.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="mb-6 lg:mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
          Inventaire
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
          Nouveau sac
        </h1>
        <p className="mt-2 max-w-lg text-muted">
          Photo, prix et quantité reçue — en une seule étape.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-xl space-y-5 lg:mx-0 lg:max-w-2xl"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-muted">
            Photo
          </span>
          <div className="mb-3 overflow-hidden rounded-[var(--sr-radius-card)] border border-border bg-surface shadow-[var(--sr-shadow-sm)]">
            <div className="aspect-[4/3] bg-border sm:aspect-[16/10]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
                  <IconPlus size={28} />
                  <span>Aperçu de la photo</span>
                </div>
              )}
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="focus-ring block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-[var(--sr-radius-pill)] file:border-0 file:bg-night file:px-4 file:font-semibold file:text-cream dark:file:bg-cream dark:file:text-night"
            onChange={(e) => void onPhotoChange(e.target.files?.[0] || null)}
          />
        </label>

        <label className="block text-sm font-medium text-muted">
          Nom *
          <input
            required
            className="focus-ring mt-1.5 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-surface px-3 shadow-[var(--sr-shadow-sm)]"
            placeholder="Cabas cognac"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-muted">
          Quantité reçue *
          <input
            required
            type="number"
            inputMode="numeric"
            min={0}
            className="focus-ring mt-1.5 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-surface px-3 shadow-[var(--sr-shadow-sm)]"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-muted">
            Prix d&apos;achat *
            <input
              required
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              className="focus-ring mt-1.5 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-surface px-3 shadow-[var(--sr-shadow-sm)]"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-muted">
            Prix visé *
            <input
              required
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              className="focus-ring mt-1.5 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-surface px-3 shadow-[var(--sr-shadow-sm)]"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link
            href="/"
            className="focus-ring inline-flex min-h-14 items-center justify-center rounded-[var(--sr-radius-pill)] border border-border bg-surface px-5 font-semibold text-muted sm:flex-1"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="focus-ring inline-flex min-h-14 items-center justify-center rounded-[var(--sr-radius-pill)] bg-brand px-5 font-bold text-brand-fg shadow-[var(--sr-shadow-sm)] disabled:opacity-60 sm:flex-[1.4]"
          >
            {loading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
