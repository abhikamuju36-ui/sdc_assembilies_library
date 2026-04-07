export default function SkeletonCard() {
  return (
    <div className="sdc-card p-6 animate-pulse flex flex-col h-full">
      <div className="flex justify-between mb-5">
        <div className="space-y-2">
          <div className="h-2 bg-[var(--bg-main)] rounded-full w-16 opacity-50" />
          <div className="h-4 bg-[var(--bg-main)] rounded-lg w-28" />
        </div>
        <div className="h-8 bg-[var(--bg-main)] rounded-xl w-8" />
      </div>
      
      <div className="space-y-3 grow">
        <div className="h-5 bg-[var(--bg-main)] rounded-xl w-3/4" />
        <div className="h-3 bg-[var(--bg-main)] rounded-lg w-1/3 opacity-50" />
        
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-[var(--bg-main)] rounded-lg w-full" />
          <div className="h-3 bg-[var(--bg-main)] rounded-lg w-5/6" />
        </div>
      </div>
      
      <div className="mt-8 pt-5 border-t border-[var(--border-color)]/30 flex justify-between items-center">
        <div className="h-4 bg-[var(--bg-main)] rounded-lg w-16" />
        <div className="h-4 bg-[var(--bg-main)] rounded-lg w-4" />
      </div>
    </div>
  );
}
