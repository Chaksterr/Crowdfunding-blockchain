// Ports réservés aux tests de bout en bout : ils ne gênent pas `npm run node`
// (8545) ni `npm run dev` (5173) qu'un développeur aurait déjà lancés.
const RPC_PORT = 8546;
const APP_PORT = 5174;

module.exports = {
  RPC_PORT,
  APP_PORT,
  RPC_URL: `http://127.0.0.1:${RPC_PORT}`,
  APP_URL: `http://127.0.0.1:${APP_PORT}`,
  CHAIN_ID: 31338,
  // Premier contrat déployé par le compte #0 d'un nœud Hardhat neuf (nonce 0).
  FACTORY_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};
