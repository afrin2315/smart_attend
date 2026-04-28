const StatsCard = ({ label, value, hint, accent = "indigo" }) => {
  const accentMap = {
    indigo: "from-brand-700 to-brand-500",
    emerald: "from-emerald-600 to-emerald-400",
    amber: "from-amber-500 to-orange-400"
  };

  return (
    <div className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
      <div className={`h-1.5 bg-gradient-to-r ${accentMap[accent] || accentMap.indigo}`} />
      <div className="p-5">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-extrabold text-slate-900">{value}</div>
        {hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
      </div>
    </div>
  );
};

export default StatsCard;
