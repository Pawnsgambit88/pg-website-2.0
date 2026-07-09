export default function Logo({ size = 36, className = '' }) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="Pawn's Gambit"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
