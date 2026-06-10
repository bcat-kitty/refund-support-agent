export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="bm-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="bm-arc" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#bm-g)" />
      <path
        d="M22.5 11.5 a7 7 0 1 0 1.6 6.4"
        fill="none"
        stroke="url(#bm-arc)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M22.7 7.6 L23.4 12.5 L18.6 11.7 Z" fill="#ffffff" />
    </svg>
  )
}
