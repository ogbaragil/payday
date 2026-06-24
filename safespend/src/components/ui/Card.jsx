export function Card({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag
      className={`rounded-3xl bg-surface shadow-card ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}
