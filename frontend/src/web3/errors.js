const DEFAULT_MESSAGE =
  'Une erreur est survenue. Vérifiez votre connexion et réessayez.';

const MISSING_METAMASK_MESSAGE =
  "MetaMask n'est pas installé. Le mode lecture seule reste disponible.";

const WRONG_NETWORK_MESSAGE =
  'Mauvais réseau : passez sur Hardhat Local (31337) pour signer cette transaction.';

const INSUFFICIENT_FUNDS_MESSAGE =
  'Solde insuffisant pour payer les frais de transaction.';

/** Le site n'a pas l'autorisation d'envoyer pour ce compte (erreur 4100). */
const UNAUTHORIZED_MESSAGE =
  "Ce compte n'est pas autorisé par le site. Déconnectez puis reconnectez MetaMask en choisissant ce compte.";

/** Le portefeuille n'est plus relié au réseau (erreurs 4900/4901). */
const DISCONNECTED_MESSAGE =
  "MetaMask n'est plus connecté au réseau. Reconnectez le portefeuille puis réessayez.";

/** Nonce local du portefeuille désynchronisé de la chaîne (après un redémarrage du nœud). */
const NONCE_MESSAGE =
  'Le portefeuille est désynchronisé du réseau. Dans MetaMask : Réglages → Avancé → « Effacer les données d’activité », puis réessayez.';

/** Chaînes require() des contrats, dans l'ordre de priorité. */
const CONTRACT_MESSAGES = [
  ['Createur uniquement', 'Seul le créateur peut effectuer cette action.'],
  ['Createur invalide', "L'adresse du créateur est invalide."],
  ['Objectif invalide', "L'objectif doit être supérieur à 0."],
  ['Don minimum invalide', 'Le don minimum doit être supérieur à 0.'],
  ['Duree invalide', 'La durée doit être supérieure à 0.'],
  ['Campagne terminee', 'La campagne est terminée : les dons sont fermés.'],
  ['Don trop faible', 'Le montant est inférieur au don minimum.'],
  ['Campagne non reussie', "La campagne n'a pas atteint son objectif."],
  ['Destinataire invalide', "L'adresse du destinataire est invalide."],
  ['Montant invalide', 'Le montant demandé est invalide.'],
  ['Demande inexistante', "Cette demande de retrait n'existe pas."],
  ['Pas donateur', 'Seuls les donateurs peuvent voter.'],
  ['Deja execute', 'Ce retrait a déjà été exécuté.'],
  ['Deja vote', 'Vous avez déjà voté pour cette demande.'],
  [
    "Moins de 50% d'approbation",
    "Il faut l'accord d'au moins la moitié des donateurs.",
  ],
  ['Solde insuffisant', 'Le solde de la campagne ne suffit pas.'],
  ['Echec du virement', 'Le virement a échoué. Réessayez.'],
  [
    'Remboursement impossible',
    "Le remboursement n'est possible que si la campagne a échoué.",
  ],
  ['Rien a rembourser', "Vous n'avez rien à récupérer sur cette campagne."],
  ['Echec du remboursement', 'Le remboursement a échoué. Réessayez.'],
];

function collectRawMessage(error) {
  if (typeof error === 'string') return error;

  return [
    error?.reason,
    error?.shortMessage,
    error?.info?.error?.message,
    error?.error?.message,
    error?.data?.message,
    error?.message,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' | ');
}

/**
 * Traduit une erreur ethers / contrat / MetaMask en message français lisible.
 * @param {unknown} error
 * @returns {string}
 */
export function mapContractError(error) {
  if (!error) return DEFAULT_MESSAGE;

  const raw = collectRawMessage(error);
  const code = error?.code ?? error?.info?.error?.code;

  if (code === 4001 || code === 'ACTION_REJECTED') {
    return 'Transaction annulée dans MetaMask.';
  }

  if (code === 'WRONG_NETWORK') {
    return WRONG_NETWORK_MESSAGE;
  }

  if (code === 'MISSING_METAMASK' || /MetaMask n'est pas installé/i.test(raw)) {
    return MISSING_METAMASK_MESSAGE;
  }

  if (code === 'INSUFFICIENT_FUNDS') {
    return INSUFFICIENT_FUNDS_MESSAGE;
  }

  if (/insufficient funds/i.test(raw)) {
    return INSUFFICIENT_FUNDS_MESSAGE;
  }

  // Le site n'a pas l'autorisation d'envoyer pour ce compte : MetaMask refuse
  // sans afficher de fenêtre de signature.
  if (
    code === 4100 ||
    code === 'UNAUTHORIZED' ||
    /not been authorized|not authorized|unauthorized|no accounts available/i.test(
      raw,
    )
  ) {
    return UNAUTHORIZED_MESSAGE;
  }

  if (
    code === 4900 ||
    code === 4901 ||
    /is not connected|not connected to the network|disconnected from/i.test(raw)
  ) {
    return DISCONNECTED_MESSAGE;
  }

  if (
    /nonce too (high|low)|nonce has already been used|replacement transaction underpriced|already known/i.test(
      raw,
    )
  ) {
    return NONCE_MESSAGE;
  }

  if (/Adresse de la fabrique introuvable/i.test(raw)) {
    return "L'adresse de la fabrique n'est pas configurée. Lancez « npm run sync » puis rechargez la page.";
  }

  if (/user rejected|user denied|action_rejected/i.test(raw)) {
    return 'Transaction annulée dans MetaMask.';
  }

  const match = CONTRACT_MESSAGES.find(([needle]) => raw.includes(needle));
  if (match) return match[1];

  if (
    /failed to fetch|network error|ECONNREFUSED|could not detect network|timeout/i.test(
      raw,
    )
  ) {
    return 'Impossible de joindre le réseau local. Vérifiez que « npm run node » est lancé.';
  }

  return DEFAULT_MESSAGE;
}

export {
  DISCONNECTED_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  MISSING_METAMASK_MESSAGE,
  NONCE_MESSAGE,
  UNAUTHORIZED_MESSAGE,
  WRONG_NETWORK_MESSAGE,
};
