const VARIANTS = {
  primary:
    "bg-jade text-white shadow-soft hover:brightness-105 active:brightness-95",
  dark: "bg-ink text-white hover:bg-ink/90 active:bg-ink",
  soft: "bg-jade-soft text-jade hover:bg-jade-soft/70 active:bg-jade-soft",
  ghost: "bg-surface text-ink border border-line hover:bg-elevated active:bg-elevated",
  quiet: "bg-transparent text-muted hover:text-ink",
  danger: "bg-clay-soft text-clay hover:brightness-105 active:brightness-95",
};

const SIZES = {
  sm: "h-10 px-4 text-sm rounded-xl",
  md: "h-12 px-5 text-[15px] rounded-2xl",
  lg: "h-14 px-6 text-base rounded-2xl",
  block: "h-14 w-full text-base rounded-2xl",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex select-none items-center justify-center gap-2 font-semibold leading-none transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
