require("@nomicfoundation/hardhat-toolbox");

// Identifiant de chaîne volontairement hors des listes publiques.
// 31337 est déjà enregistré dans MetaMask comme « GoChain Testnet » (symbole
// GO) : l'ajout d'un réseau local avec ce chainId déclenche l'alerte
// « Unexpected Native Token Symbol » et permet deux réseaux homonymes dans le
// portefeuille, donc des signatures sur la mauvaise chaîne. 31338 (0x7a6a) est
// libre et ne provoque aucune collision.
const CHAIN_ID = 31338;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // `npx hardhat node` et `npx hardhat test` (réseau en mémoire)
    hardhat: { chainId: CHAIN_ID },
    // Réseau local lancé par `npx hardhat node`
    localhost: { url: "http://127.0.0.1:8545", chainId: CHAIN_ID },
  },
};
