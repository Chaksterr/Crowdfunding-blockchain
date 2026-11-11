import { BrowserProvider, JsonRpcProvider } from 'ethers';
import {
  CHAIN_ID,
  CHAIN_NAME,
  EXPLORER_URL,
  RPC_URL,
} from '../config';

/**
 * Fournisseur de lecture : toujours disponible, même sans MetaMask.
 * Il interroge directement le nœud JSON-RPC (aucune signature requise).
 */
export const readProvider = new JsonRpcProvider(RPC_URL);

let browserProvider = null;

/** MetaMask est-il injecté dans la page ? */
export function hasMetaMask() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

/** Fournisseur adossé au portefeuille du navigateur, ou null sans MetaMask. */
export function getBrowserProvider() {
  if (!hasMetaMask()) return null;
  if (!browserProvider) {
    browserProvider = new BrowserProvider(window.ethereum);
  }
  return browserProvider;
}

function missingMetaMaskError() {
  const error = new Error(
    "MetaMask n'est pas installé. Le mode lecture seule reste disponible.",
  );
  error.code = 'MISSING_METAMASK';
  return error;
}

function wrongNetworkError(chainId) {
  const error = new Error(
    `Le portefeuille est sur la chaîne ${chainId} au lieu de ${CHAIN_ID}.`,
  );
  error.code = 'WRONG_NETWORK';
  return error;
}

/**
 * Signataire MetaMask, pour les transactions. Échoue proprement si aucun
 * portefeuille n'est disponible, ou s'il n'est pas sur la chaîne locale :
 * la transaction partirait sinon vers un autre réseau (voter, retirer,
 * rembourser…), où elle échouerait ou ne ferait rien.
 */
export async function getSigner() {
  const provider = getBrowserProvider();
  if (!provider) throw missingMetaMaskError();

  const chainId = await getWalletChainId();
  if (chainId !== CHAIN_ID) throw wrongNetworkError(chainId);

  return provider.getSigner();
}

/** Demande l'accès au compte et renvoie adresse + chaîne courante. */
export async function connectWallet() {
  const provider = getBrowserProvider();
  if (!provider) throw missingMetaMaskError();

  const accounts = await provider.send('eth_requestAccounts', []);
  const chainId = Number.parseInt(
    await provider.send('eth_chainId', []),
    16,
  );

  return {
    provider,
    account: accounts?.[0] ?? null,
    chainId,
  };
}

/** Chaîne active du portefeuille (fraîche, sans cache ethers). */
export async function getWalletChainId() {
  const provider = getBrowserProvider();
  if (!provider) throw missingMetaMaskError();
  return Number.parseInt(await provider.send('eth_chainId', []), 16);
}

/**
 * Force la chaîne Hardhat locale (31337). Bascule si le réseau est déjà connu,
 * sinon propose de l'ajouter à MetaMask.
 * @returns {Promise<number>} la chaîne active après l'opération
 */
export async function ensureChain(chainId = CHAIN_ID) {
  const provider = getBrowserProvider();
  if (!provider) throw missingMetaMaskError();

  const targetHex = `0x${chainId.toString(16)}`;
  const current = await getWalletChainId();
  if (current === chainId) return chainId;

  try {
    await provider.send('wallet_switchEthereumChain', [
      { chainId: targetHex },
    ]);
  } catch (error) {
    const code =
      error?.code ?? error?.data?.originalError?.code ?? error?.info?.error?.code;
    const unrecognized =
      code === 4902 || /unrecognized chain/i.test(error?.message ?? '');

    if (!unrecognized) throw error;

    await provider.send('wallet_addEthereumChain', [
      {
        chainId: targetHex,
        chainName: CHAIN_NAME,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: [RPC_URL],
        blockExplorerUrls: [EXPLORER_URL],
      },
    ]);

    // Certains portefeuilles ajoutent le réseau sans basculer automatiquement.
    const active = await getWalletChainId().catch(() => chainId);
    if (active !== chainId) {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: targetHex },
      ]);
    }
  }

  return chainId;
}

/**
 * Solde d'un compte en wei (bigint).
 * @param {string} address
 * @param {import('ethers').Provider} [provider] défaut : lecture RPC
 */
export async function getWalletBalance(address, provider = readProvider) {
  const runner = provider ?? readProvider;
  return runner.getBalance(address);
}

/**
 * Écoute les changements de compte et de réseau du portefeuille.
 * @param {{ onAccountsChanged?: (accounts: string[]) => void, onChainChanged?: (chainId: number) => void }} handlers
 * @returns {() => void} nettoyage des écouteurs
 */
export function watchWallet(handlers = {}) {
  if (!hasMetaMask()) return () => {};

  const ethereum = window.ethereum;

  const handleAccounts = (accounts) => {
    handlers.onAccountsChanged?.(Array.isArray(accounts) ? accounts : []);
  };

  const handleChain = (chainIdHex) => {
    // ethers met en cache le réseau du BrowserProvider : on le recrée après
    // une bascule pour que les prochaines lectures utilisent la bonne chaîne.
    browserProvider = null;
    handlers.onChainChanged?.(Number.parseInt(chainIdHex, 16));
  };

  ethereum.on?.('accountsChanged', handleAccounts);
  ethereum.on?.('chainChanged', handleChain);

  return () => {
    ethereum.removeListener?.('accountsChanged', handleAccounts);
    ethereum.removeListener?.('chainChanged', handleChain);
  };
}

export { CHAIN_ID, CHAIN_NAME, RPC_URL };
