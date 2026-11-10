import { Link } from 'react-router-dom';
import Button, { buttonClass } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { useWallet } from '../hooks/useWallet';
import { hasMetaMask } from '../web3/provider';

function CoinsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="6.75" rx="7.5" ry="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 6.75v4.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-4.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 11.25v4.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-4.5"
      />
      <path strokeLinecap="round" d="M9 15.75h.008M15 15.75h.008" />
    </svg>
  );
}

export default function MyContributionsPage() {
  const { isConnected, connect } = useWallet();
  const metaMaskAvailable = hasMetaMask();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mon espace"
        title="Mes contributions"
        description="Retrouvez les campagnes que vous avez soutenues, le montant donné et les remboursements disponibles."
      />

      <EmptyState
        icon={<CoinsIcon />}
        title="Vos contributions arriveront ici"
        description="Cette page parcourra les campagnes et gardera celles où votre adresse a donné plus de zéro. Le total personnel et les remboursements seront calculés à l’étape suivante."
        action={
          !isConnected && metaMaskAvailable ? (
            <Button variant="secondary" onClick={connect}>
              Connecter MetaMask
            </Button>
          ) : (
            <Link
              to="/"
              className={buttonClass({ variant: 'secondary', size: 'md' })}
            >
              Explorer les campagnes
            </Link>
          )
        }
      />

      <p className="text-center text-xs leading-relaxed text-slate-500">
        Aucune donnée n’est simulée : les contributions seront lues dans chaque
        contrat, sans transaction.
      </p>
    </div>
  );
}
