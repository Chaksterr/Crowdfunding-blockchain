const { ethers } = require('ethers');
const { FACTORY_ADDRESS, RPC_PORT } = require('./constants');
const { Chain } = require('./chain');
const artifact = require('../../artifacts/contracts/Crowdfunding.sol/Crowdfunding.json');

/**
 * Déploie la fabrique sur le nœud de test (lancé par `webServer`, avant ce
 * fichier). Sur un nœud neuf, le compte #0 la déploie toujours à la même
 * adresse : c'est celle que reçoit l'application web.
 */
module.exports = async function globalSetup() {
  const chain = new Chain();
  try {
    const [deployer] = await chain.accounts();
    const factory = await new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      await chain.signer(deployer),
    ).deploy();
    await factory.waitForDeployment();

    const address = await factory.getAddress();
    if (address.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
      throw new Error(
        `Fabrique déployée à ${address} au lieu de ${FACTORY_ADDRESS} : le nœud du port ${RPC_PORT} doit être neuf.`,
      );
    }
  } finally {
    chain.close();
  }
};
