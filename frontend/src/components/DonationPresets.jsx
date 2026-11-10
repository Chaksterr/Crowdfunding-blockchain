import { ethInputValue } from '../web3/format';

/**
 * Préréglages de montant de don.
 *
 * Les captions restent génériques : elles décrivent un usage type, jamais un
 * fait propre à la campagne (rien n'est inventé sur la chaîne).
 */
const CAPTIONS = {
  min: 'du matériel',
  half: 'un poste de travail',
  one: 'une demi-journée',
  two: 'une journée complète',
};

/**
 * @param {{min: bigint, value: string, onSelect: (value: string) => void}} props
 */
export default function DonationPresets({ min, value, onSelect }) {
  const presets = [
    { id: 'min', label: ethInputValue(min), caption: CAPTIONS.min },
    { id: 'half', label: '0,5', caption: CAPTIONS.half },
    { id: 'one', label: '1', caption: CAPTIONS.one },
    { id: 'two', label: '2', caption: CAPTIONS.two },
  ];

  return (
    <div
      role="group"
      aria-label="Montants suggérés"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {presets.map((preset) => {
        const isActive = value === preset.label;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.label)}
            aria-pressed={isActive}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] ${
              isActive
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'
            }`}
          >
            <span className="text-sm font-semibold tabular-nums">
              {preset.label} ETH
            </span>
            <span className="text-[11px] leading-tight text-slate-500">
              {preset.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}
