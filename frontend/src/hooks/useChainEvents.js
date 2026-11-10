import { useEffect, useRef } from 'react';
import { getFactory, getProject } from '../web3/contracts';

const PROJECT_EVENTS = [
  'DonationReceived',
  'WithdrawRequestCreated',
  'WithdrawVote',
  'FundsWithdrawn',
  'Refunded',
];

/**
 * Abonne l'interface aux événements d'une campagne.
 * Le callback est conservé dans une ref pour éviter de recréer les
 * abonnements à chaque rendu.
 */
export function useProjectEvents(address, onChange, enabled = true) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled || !address) return undefined;

    let project;
    try {
      project = getProject(address);
    } catch {
      return undefined;
    }

    const handler = () => callbackRef.current?.();
    for (const eventName of PROJECT_EVENTS) {
      project.on(eventName, handler);
    }

    return () => {
      for (const eventName of PROJECT_EVENTS) {
        project.off(eventName, handler);
      }
    };
  }, [address, enabled]);
}

/** Abonne l'accueil à la création de nouvelles campagnes. */
export function useFactoryEvents(onChange, enabled = true) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled) return undefined;

    const factory = getFactory();
    const handler = () => callbackRef.current?.();
    factory.on('ProjectCreated', handler);

    return () => {
      factory.off('ProjectCreated', handler);
    };
  }, [enabled]);
}
