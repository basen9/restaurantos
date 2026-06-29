import { cn } from '@/lib/utils'

const variants: Record<string, string> = {
  gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  gray: 'bg-white/5 text-[#9AAAB8] border-white/10',
}

export function Badge({ children, variant = 'gray', className }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={cn('badge border', variants[variant] || variants.gray, className)}>
      {children}
    </span>
  )
}
