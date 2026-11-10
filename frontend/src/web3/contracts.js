import { Contract, isAddress } from 'ethers';
import factoryAbi from '../abi/Crowdfunding.json';
import projectAbi from '../abi/Project.json';
import { FACTORY_ADDRESS } from '../config';
import { readProvider } from './provider';

export { FACTORY_ADDRESS };
export const FACTORY_ABI = factoryAbi;
export const PROJECT_ABI = projectAbi;

/** États renvoyés par Project.getStatus(). */
export const STATUS = Object.freeze({
  0: 'En cours',
  1: 'Échouée',
  2: 'Réussie',
});

function requireFactoryAddress() {
  if (!FACTORY_ADDRESS || !isAddress(FACTORY_ADDRESS)) {
    throw new Error(
      "Adresse de la fabrique introuvable. Lancez « npm run sync » puis rechargez la page.",
    );
  }
}

/** Instance de la fabrique, en lecture par défaut. */
export function getFactory(runner = readProvider) {
  requireFactoryAddress();
  return new Contract(FACTORY_ADDRESS, FACTORY_ABI, runner);
}

/** Instance d'une campagne, en lecture par défaut. */
export function getProject(address, runner = readProvider) {
  return new Contract(address, PROJECT_ABI, runner);
}
