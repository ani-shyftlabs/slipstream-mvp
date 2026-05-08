export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 rounded-md bg-silver/50 animate-pulse" />
        <div className="h-4 w-64 rounded-md bg-silver/40 animate-pulse" />
      </div>
      <div className="rounded-xl border border-silver bg-white shadow-mac-md p-6 flex flex-col gap-4">
        <div className="h-5 w-32 rounded-md bg-silver/50 animate-pulse" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-silver bg-silver/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
