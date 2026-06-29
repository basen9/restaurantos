export function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3 opacity-30">{icon}</div>
      <div className="text-sm font-medium text-[#6B7A8D]">{text}</div>
      {sub && <div className="text-xs text-[#6B7A8D]/60 mt-1">{sub}</div>}
    </div>
  )
}
