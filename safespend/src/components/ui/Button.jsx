const VARIANTS = {
  primary:
    "bg-iris text-white shadow-iris hover:brightness-110 active:brightness-95",
  dark: "bg-hero text-white hover:bg-hero-2 active:bg-hero",
  soft: "bg-iris-soft text-iris hover:brightness-[0.97] active:brightness-95",
  ghost: "bg-surface text-iris border border-iris/25 hover:bg-iris-soft/50 active:bg-iris-soft",
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
