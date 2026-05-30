export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
      <div>
        {eyebrow && <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-500 mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter text-slate-900">{title}</h1>
        {description && <p className="text-slate-600 mt-2 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = "slate" }) {
  const accents = {
    slate: "border-slate-200",
    blue: "border-blue-200",
    green: "border-emerald-200",
    red: "border-red-200",
  };
  return (
    <div className={`bg-white border ${accents[accent]} rounded-lg p-5 shadow-sm`}>
      <p className="text-[11px] tracking-[0.2em] uppercase font-bold text-slate-500">{label}</p>
      <p className="font-display text-3xl font-black tracking-tighter text-slate-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function SectionCard({ title, children, action }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h3 className="font-display font-semibold tracking-tight">{title}</h3>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
