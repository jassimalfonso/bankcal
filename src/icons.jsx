// Small hand-tuned line icons (24px grid, 1.8 stroke).
const S = ({ children, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const IconToday = (p) => (
  <S {...p}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18M7 15h4" />
  </S>
)
export const IconStatement = (p) => (
  <S {...p}>
    <path d="M6 3h9l3 3v15H6z" />
    <path d="M9 10h6M9 14h6M9 18h3" />
  </S>
)
export const IconMe = (p) => (
  <S {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </S>
)
export const IconPlus = (p) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
)
export const IconCamera = (p) => (
  <S {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </S>
)
export const IconClose = (p) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
)
export const IconSwap = (p) => (
  <S {...p}>
    <path d="M7 4L4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7" />
  </S>
)
