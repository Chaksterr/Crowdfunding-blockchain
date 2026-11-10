import { campaignTheme } from './campaignTheme';

/**
 * Bandeau décoratif d'une campagne : dégradé dérivé de l'adresse, motif SVG
 * déterministe et picto, sans image externe. Aucune sémantique (purement
 * visuel) : le conteneur est `aria-hidden`, aucun `role="img"` inutile.
 */
export default function CampaignBanner({
  address,
  size = 'md',
  className = '',
  children,
}) {
  const { emoji, gradient, pattern, patternSize } = campaignTheme(address);

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} ${
        size === 'lg' ? 'h-40 sm:h-48' : 'h-28'
      } ${className}`}
    >
      {/* Couche de motif : SVG inline généré, aucune ressource externe. */}
      <span
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundSize: patternSize,
        }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-white/40 via-white/10 to-white/25" />
      <span className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/40" />
      <span className="absolute -bottom-12 right-8 h-28 w-28 rounded-full bg-white/30" />
      <span className="absolute bottom-4 left-6 h-10 w-10 rounded-full bg-white/25" />
      <span className="relative text-5xl leading-none drop-shadow-sm sm:text-6xl">
        {emoji}
      </span>
      {children}
    </div>
  );
}
