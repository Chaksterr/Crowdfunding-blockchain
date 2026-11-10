import { campaignTheme } from './campaignTheme';

/**
 * Bandeau décoratif d'une campagne : dégradé dérivé de l'adresse + picto
 * centré, sans image externe. Aucune sémantique (purement visuel).
 */
export default function CampaignBanner({
  address,
  size = 'md',
  className = '',
  children,
}) {
  const { emoji } = campaignTheme(address);

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${campaignTheme(
        address,
      ).gradient} ${
        size === 'lg' ? 'h-40 sm:h-48' : 'h-28'
      } ${className}`}
    >
      <span className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/40" />
      <span className="absolute -bottom-12 right-8 h-28 w-28 rounded-full bg-white/30" />
      <span className="absolute bottom-4 left-6 h-10 w-10 rounded-full bg-white/25" />
      <span
        className="relative text-5xl leading-none drop-shadow-sm sm:text-6xl"
        role="img"
        aria-label=""
      >
        {emoji}
      </span>
      {children}
    </div>
  );
}
