const { ethers } = require('ethers');
const { CHAIN_ID, FACTORY_ADDRESS, RPC_URL } = require('./constants');
const factoryAbi = require('../../frontend/src/abi/Crowdfunding.json');
const projectAbi = require('../../frontend/src/abi/Project.json');

const eth = (amount) => ethers.parseEther(String(amount));

/**
 * Accès direct à la blockchain de test, côté Node : préparer des données sans
 * passer par l'interface, avancer l'horloge et vérifier les soldes.
 * Les comptes du nœud Hardhat sont déverrouillés : le nœud signe lui-même,
 * aucune clé privée n'apparaît dans les tests.
 */
class Chain {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {
      staticNetwork: true,
      // ethers réutilise une réponse identique pendant 250 ms par défaut : un
      // solde relu juste après une transaction serait encore l'ancien.
      cacheTimeout: -1,
    });
  }

  /** Les 20 comptes de test du nœud, au format checksum. */
  async accounts() {
    const accounts = await this.provider.send('eth_accounts', []);
    return accounts.map((account) => ethers.getAddress(account));
  }

  async signer(address) {
    return this.provider.getSigner(address);
  }

  project(address, runner = this.provider) {
    return new ethers.Contract(address, projectAbi, runner);
  }

  async createCampaign(
    creator,
    { title, description, goal, minContribution, durationSeconds },
  ) {
    const factory = new ethers.Contract(
      FACTORY_ADDRESS,
      factoryAbi,
      await this.signer(creator),
    );
    const transaction = await factory.createProject(
      title,
      description ?? `${title} : campagne préparée par les tests de bout en bout.`,
      eth(goal),
      eth(minContribution),
      durationSeconds,
    );
    const receipt = await transaction.wait();
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === 'ProjectCreated');
    return created.args.project;
  }

  async donate(project, donor, amount) {
    const contract = this.project(project, await this.signer(donor));
    await (await contract.contribute({ value: eth(amount) })).wait();
  }

  async requestWithdrawal(project, creator, { amount, reason, recipient }) {
    const contract = this.project(project, await this.signer(creator));
    await (await contract.createWithdrawRequest(eth(amount), reason, recipient)).wait();
  }

  async vote(project, donor, requestId) {
    const contract = this.project(project, await this.signer(donor));
    await (await contract.voteWithdrawRequest(requestId)).wait();
  }

  async withdraw(project, caller, requestId) {
    const contract = this.project(project, await this.signer(caller));
    await (await contract.withdrawRequestedAmount(requestId)).wait();
  }

  async refund(project, donor) {
    const contract = this.project(project, await this.signer(donor));
    await (await contract.refund()).wait();
  }

  /**
   * Avance l'horloge de la chaîne. Sans bloc miné (`mine: false`), les
   * lectures voient encore l'ancienne heure mais la prochaine transaction
   * sera exécutée à la nouvelle : c'est le cas d'une page restée ouverte
   * pendant que la date limite passe.
   */
  async increaseTime(seconds, { mine = true } = {}) {
    await this.provider.send('evm_increaseTime', [seconds]);
    if (mine) await this.provider.send('evm_mine', []);
  }

  balance(address) {
    return this.provider.getBalance(address);
  }

  contribution(project, donor) {
    return this.project(project).contributions(donor);
  }

  close() {
    this.provider.destroy();
  }
}

module.exports = { Chain, eth };
