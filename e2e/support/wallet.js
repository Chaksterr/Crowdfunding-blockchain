const { CHAIN_ID, RPC_URL } = require('./constants');

/**
 * Portefeuille de test injecté dans la page à la place de MetaMask (EIP-1193).
 * Il répond comme MetaMask aux demandes de compte et de réseau, et transmet
 * le reste au nœud Hardhat, qui signe avec ses comptes de test déverrouillés.
 * Le compte et le réseau choisis survivent à un rechargement, comme avec
 * MetaMask.
 *
 * Cette fonction est sérialisée et exécutée dans le navigateur : elle ne
 * peut utiliser que ses paramètres.
 */
function testWallet({
  account,
  chainId,
  connected,
  rejectNetworkSwitch,
  expectedChainId,
  rpcUrl,
}) {
  const KEY = 'test-wallet';
  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Page sans origine (about:blank) : pas de stockage, pas d'application.
  }

  const state = JSON.parse(storage?.getItem(KEY) ?? 'null') ?? {
    account,
    chainId,
    connected,
    attemptsOnWrongChain: 0,
  };
  const save = () => storage?.setItem(KEY, JSON.stringify(state));
  const listeners = {};
  const emit = (event, value) =>
    (listeners[event] ?? []).slice().forEach((listener) => listener(value));
  const fail = (message, code) => Object.assign(new Error(message), { code });
  let nextId = 0;

  async function forward(method, params) {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++nextId, method, params }),
    });
    const body = await response.json();
    if (body.error) {
      throw Object.assign(new Error(body.error.message), {
        code: body.error.code,
        data: body.error.data,
      });
    }
    return body.result;
  }

  window.ethereum = {
    isMetaMask: true,
    async request({ method, params = [] }) {
      switch (method) {
        case 'eth_accounts':
          return state.connected ? [state.account] : [];
        case 'eth_requestAccounts':
          state.connected = true;
          save();
          return [state.account];
        case 'eth_chainId':
          return `0x${state.chainId.toString(16)}`;
        case 'net_version':
          return String(state.chainId);
        case 'wallet_switchEthereumChain':
          if (rejectNetworkSwitch) {
            throw fail('User rejected the request.', 4001);
          }
          state.chainId = Number.parseInt(params[0].chainId, 16);
          save();
          emit('chainChanged', params[0].chainId);
          return null;
        case 'wallet_addEthereumChain':
          return null;
        case 'eth_sendTransaction':
          if (state.chainId !== expectedChainId) {
            // Le vrai MetaMask enverrait la transaction sur cet autre réseau.
            state.attemptsOnWrongChain += 1;
            save();
            throw fail(
              `Transaction envoyée sur la chaîne ${state.chainId}.`,
              -32000,
            );
          }
          return forward(method, params);
        default:
          return forward(method, params);
      }
    },
    on(event, listener) {
      (listeners[event] ??= []).push(listener);
      return this;
    },
    removeListener(event, listener) {
      listeners[event] = (listeners[event] ?? []).filter(
        (registered) => registered !== listener,
      );
      return this;
    },
  };

  // Commandes des tests : l'équivalent d'un clic dans l'extension MetaMask.
  window.__testWallet = {
    switchAccount(next) {
      state.account = next;
      save();
      emit('accountsChanged', [next]);
    },
    attemptsOnWrongChain: () => state.attemptsOnWrongChain,
  };
}

/**
 * Installe le portefeuille de test avant le chargement de l'application.
 * `connected: false` simule un site pas encore autorisé dans MetaMask ;
 * `chainId` et `rejectNetworkSwitch` simulent un utilisateur resté sur un
 * autre réseau.
 */
async function installWallet(
  page,
  { account, chainId = CHAIN_ID, connected = true, rejectNetworkSwitch = false },
) {
  await page.addInitScript(testWallet, {
    account,
    chainId,
    connected,
    rejectNetworkSwitch,
    expectedChainId: CHAIN_ID,
    rpcUrl: RPC_URL,
  });
}

/** Change de compte, comme dans MetaMask, sans recharger la page. */
async function switchAccount(page, account) {
  await page.evaluate((next) => window.__testWallet.switchAccount(next), account);
}

/** Nombre de transactions que le portefeuille aurait envoyées au mauvais réseau. */
async function attemptsOnWrongChain(page) {
  return page.evaluate(() => window.__testWallet.attemptsOnWrongChain());
}

module.exports = { installWallet, switchAccount, attemptsOnWrongChain };
