function StatCard({
  title,
  amount,
  subtitle,
  icon: Icon,
  iconBg = "bg-indigo-50",
  iconColor = "text-indigo-600",
}) {
  return (
    <div
      className="
        rounded-2xl border border-slate-200 bg-white p-5
        shadow-sm
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-md
        dark:border-slate-800
        dark:bg-slate-900
        dark:shadow-black/10
        dark:hover:border-slate-700
        dark:hover:shadow-black/20
      "
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {amount}
          </h3>
        </div>

        <div
          className={`
            flex h-11 w-11 items-center justify-center
            rounded-xl
            ${iconBg}
            ${iconColor}
          `}
        >
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

export default StatCard;