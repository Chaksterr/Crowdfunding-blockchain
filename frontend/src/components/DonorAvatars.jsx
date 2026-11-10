import { campaignTheme, donorAddress } from './campaignTheme';

function donorInitials(address) {
  const clean = String(address).toLowerCase().replace(/^0x/, '');
  return clean.slice(0, 2).toUpperCase() || '…';
}

/**
 * Petit amas d'avatars à initiales, dérivés des adresses des donateurs
 * (maximum 3 visibles + "+N"). Décoratif : le nombre de donateurs reste
 * annoncé par le texte qui l'accompagne.
 */
export default function DonorAvatars({ donors = [], max = 3, className = '' }) {
  if (donors.length === 0) return null;

  const shown = donors.slice(0, max);
  const extra = donors.length - shown.length;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center -space-x-1.5 ${className}`}
    >
      {shown.map((donor, index) => {
        const address = donorAddress(donor);
        const { avatarStyle, monogram } = campaignTheme(address || String(index));
        return (
          <span
            key={address || `donor-${index}`}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold uppercase ring-2 ring-white ${avatarStyle}`}
          >
            {donorInitials(address)}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="flex h-7 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-slate-500 ring-2 ring-white">
          +{extra}
        </span>
      )}
    </span>
  );
}
