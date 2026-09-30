export function Logo({ withText = true, className }: { withText?: boolean; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <path d="M16 2 29 9.5v13L16 30 3 22.5v-13z" fill="#f97316" />
        <path d="M16 2 29 9.5 16 17 3 9.5z" fill="#fdba74" />
        <path d="M16 17v13L3 22.5v-13z" fill="#c2410c" />
      </svg>
      {withText && (
        <span className="text-[15px] font-bold tracking-tight">
          Gilardi<span className="text-accent">3D</span>
        </span>
      )}
    </span>
  );
}
