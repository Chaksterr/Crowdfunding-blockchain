import { isAddress } from 'ethers';
import deployed from './deployed.json';

/** URL du nœud JSON-RPC, surchargeable via VITE_RPC_URL. */
export const RPC_URL =
  (import.meta.env.VITE_RPC_URL || '').trim() || 'http://127.0.0.1:8545';

/**
 * Chaîne Hardhat locale imposée pour les écritures.
 * 31338 plutôt que le 31337 par défaut : ce dernier appartient déjà à
 * « GoChain Testnet » dans la liste des chaînes de MetaMask (symbole GO), ce
 * qui provoque une alerte et des collisions de réseaux dans le portefeuille.
 */
export const CHAIN_ID = 31338;
export const CHAIN_ID_HEX = '0x7a6a';
export const CHAIN_NAME = 'Hardhat Local';

/**
 * Aucun explorateur n'existe pour le réseau local : valeur neutre fournie à
 * MetaMask lors de l'ajout du réseau.
 */
export const EXPLORER_URL = 'https://explorer.local';

const envFactory = (import.meta.env.VITE_FACTORY_ADDRESS || '').trim();
const deployedFactory =
  typeof deployed?.address === 'string' ? deployed.address.trim() : '';

if (envFactory && !isAddress(envFactory) && import.meta.env.DEV) {
  console.warn(
    '[config] VITE_FACTORY_ADDRESS est invalide, utilisation de src/deployed.json.',
  );
}

/** Adresse de la fabrique : variable d'environnement valide, sinon deployed.json. */
export const FACTORY_ADDRESS = isAddress(envFactory)
  ? envFactory
  : deployedFactory;
