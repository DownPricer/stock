import Image from "next/image";

type Props = {
  className?: string;
  showWordmark?: boolean;
  size?: number;
  tone?: "auto" | "onDark" | "onLight";
};

export function SiteReadyMark({
  className = "",
  showWordmark = true,
  size = 28,
  tone = "auto",
}: Props) {
  const textClass =
    tone === "onDark"
      ? "text-sidebar-fg"
      : tone === "onLight"
        ? "text-night"
        : "text-foreground";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/brand/siteready-mark.png"
        alt=""
        width={size}
        height={size}
        className="rounded-[8px]"
        priority
      />
      {showWordmark ? (
        <span
          className={`font-display text-[0.95rem] font-extrabold tracking-tight ${textClass}`}
        >
          SiteReady
        </span>
      ) : null}
    </span>
  );
}

/** Lien SEO-friendly vers le site SiteReady — pas de nofollow. */
export function SiteReadyCredit({
  className = "",
  tone = "auto",
}: {
  className?: string;
  tone?: "auto" | "onDark" | "onLight";
}) {
  const muted =
    tone === "onDark"
      ? "text-sidebar-muted"
      : tone === "onLight"
        ? "text-[color-mix(in_srgb,var(--sr-night)_55%,transparent)]"
        : "text-muted";

  return (
    <a
      href="https://sitereadyshd.fr"
      target="_blank"
      rel="noopener"
      className={`focus-ring inline-flex items-center gap-2 rounded-[var(--sr-radius-pill)] text-sm transition-opacity hover:opacity-80 ${className}`}
    >
      <span className={muted}>Créé par</span>
      <SiteReadyMark size={22} tone={tone} />
    </a>
  );
}
