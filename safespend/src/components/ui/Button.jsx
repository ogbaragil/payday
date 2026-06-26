const VARIANTS = {
  primary: "border-[1.6px] border-iris/70 bg-iris-soft/70 text-iris hover:bg-iris-soft active:brightness-95",
  dark: "border-[1.6px] border-line/80 bg-elevated/40 text-ink hover:bg-elevated active:brightness-95",
  soft: "border-[1.6px] border-iris/40 bg-iris-soft/60 text-iris hover:bg-iris-soft active:brightness-95",
  ghost: "border-[1.6px] border-iris/45 bg-transparent text-iris hover:bg-iris-soft/50 active:bg-iris-soft",
  quiet: "bg-transparent text-muted hover:text-ink",
  danger: "border-[1.6px] border-clay/55 bg-clay-soft/70 text-clay hover:bg-clay-soft active:brightness-95",
};

const SIZES = {
  sm: "h-10 px-4 text-[16px] rounded-xl",
  md: "h-12 px-5 text-[17px] rounded-2xl",
  lg: "h-14 px-6 text-[18px] rounded-2xl",
  block: "h-14 w-full text-[18px] rounded-2xl",
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
      className={`inline-flex select-none items-center justify-center gap-2 font-display leading-none tracking-tight transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
