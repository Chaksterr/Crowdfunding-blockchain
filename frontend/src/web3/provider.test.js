import { afterEach, describe, expect, it, vi } from 'vitest';

const ACCOUNT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

/** Faux MetaMask : répond à quelques méthodes et refuse les autres. */
function installWallet(chainIdHex) {
  const request = vi.fn(async ({ method }) => {
    if (method === 'eth_chainId') return chainIdHex;
    if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
      return [ACCOUNT];
    }
    throw new Error(`Méthode inattendue : ${method}`);
  });
  window.ethereum = { request, on: vi.fn(), removeListener: vi.fn() };
  return request;
}

// provider.js garde le BrowserProvider en cache : on recharge le module à
// chaque test pour repartir d'un portefeuille neuf.
async function loadProvider() {
  vi.resetModules();
  return import('./provider');
}

describe('getSigner', () => {
  afterEach(() => {
    delete window.ethereum;
  });

  it('refuse de signer quand le portefeuille est sur un autre réseau', async () => {
    const request = installWallet('0x1');
    const { getSigner } = await loadProvider();

    await expect(getSigner()).rejects.toMatchObject({ code: 'WRONG_NETWORK' });
    expect(request).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'eth_requestAccounts' }),
    );
  });

  it('renvoie le signataire du compte connecté sur Hardhat Local (31337)', async () => {
    installWallet('0x7a69');
    const { getSigner } = await loadProvider();

    const signer = await getSigner();

    expect(signer.address).toBe(ACCOUNT);
  });

  it('signale l’absence de MetaMask', async () => {
    const { getSigner } = await loadProvider();

    await expect(getSigner()).rejects.toMatchObject({
      code: 'MISSING_METAMASK',
    });
  });
});
