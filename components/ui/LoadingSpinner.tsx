export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return <div className={`${s} border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin`} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
