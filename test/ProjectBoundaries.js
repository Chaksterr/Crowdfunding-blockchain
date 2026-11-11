const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const eth = ethers.parseEther;
const DURATION = 3600;
const GOAL = eth("10");
const MIN = eth("0.1");
const [ONGOING, FAILED, SUCCESSFUL] = [0n, 1n, 2n];

// Valeurs limites et invariants : la couverture de lignes est déjà à 100 %,
// ces tests ciblent les erreurs « à un près » (<, <=, >=) et l'état après coup.
async function deploy() {
  const [creator, d1, d2, d3, d4, stranger] = await ethers.getSigners();
  const Project = await ethers.getContractFactory("Project");
  const project = await Project.deploy(creator.address, "Titre", "Desc", GOAL, MIN, DURATION);
  return { project, creator, d1, d2, d3, d4, stranger };
}

async function twoDonorsFixture() { // 12 ETH, 2 donateurs
  const c = await deploy();
  await c.project.connect(c.d1).contribute({ value: eth("6") });
  await c.project.connect(c.d2).contribute({ value: eth("6") });
  await time.increase(DURATION + 1);
  await c.project.connect(c.creator).createWithdrawRequest(eth("4"), "Materiel", c.stranger.address);
  return c;
}

async function fourDonorsFixture() { // 12 ETH, 4 donateurs
  const c = await deploy();
  for (const donor of [c.d1, c.d2, c.d3, c.d4]) {
    await c.project.connect(donor).contribute({ value: eth("3") });
  }
  await time.increase(DURATION + 1);
  await c.project.connect(c.creator).createWithdrawRequest(eth("4"), "Materiel", c.stranger.address);
  return c;
}

async function failedFixture() { // 3 ETH < 10 ETH
  const c = await deploy();
  await c.project.connect(c.d1).contribute({ value: eth("1") });
  await c.project.connect(c.d2).contribute({ value: eth("2") });
  await time.increase(DURATION + 1);
  return c;
}

describe("Project — valeurs limites et invariants", function () {
  describe("Don minimum (RG2)", function () {
    it("accepte un don égal au minimum exact", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await expect(project.connect(d1).contribute({ value: MIN }))
        .to.emit(project, "DonationReceived").withArgs(d1.address, MIN);
    });
    it("refuse un don inférieur d'un seul wei au minimum", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await expect(project.connect(d1).contribute({ value: MIN - 1n })).to.be.revertedWith("Don trop faible");
    });
    it("refuse un don nul", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await expect(project.connect(d1).contribute({ value: 0 })).to.be.revertedWith("Don trop faible");
    });
  });

  describe("Deadline (RG2, RG3)", function () {
    it("fixe la deadline à l'heure de déploiement + durée", async function () {
      const { project } = await loadFixture(deploy);
      expect(await project.deadline()).to.equal(BigInt(await time.latest()) + BigInt(DURATION));
    });
    it("accepte un don à la dernière seconde avant la deadline", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await time.setNextBlockTimestamp((await project.deadline()) - 1n);
      await expect(project.connect(d1).contribute({ value: eth("1") })).to.emit(project, "DonationReceived");
    });
    it("refuse un don pile à la deadline", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await time.setNextBlockTimestamp(await project.deadline());
      await expect(project.connect(d1).contribute({ value: eth("1") })).to.be.revertedWith("Campagne terminee");
    });
    it("autorise le remboursement dès la seconde de la deadline", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await project.connect(d1).contribute({ value: eth("1") });
      await time.setNextBlockTimestamp(await project.deadline());
      await expect(project.connect(d1).refund()).to.changeEtherBalance(d1, eth("1"));
    });
    it("timeLeft décompte exactement les secondes restantes", async function () {
      const { project } = await loadFixture(deploy);
      const deadline = await project.deadline();
      await time.increaseTo(deadline - 100n);
      expect(await project.timeLeft()).to.equal(100n);
      await time.increaseTo(deadline);
      expect(await project.timeLeft()).to.equal(0n);
      expect(await project.getStatus()).to.not.equal(ONGOING);
    });
  });

  describe("Objectif (RG3)", function () {
    it("réussie quand le total atteint exactement l'objectif", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await project.connect(d1).contribute({ value: GOAL });
      await time.increase(DURATION + 1);
      expect(await project.getStatus()).to.equal(SUCCESSFUL);
    });
    it("échouée à un wei de l'objectif", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await project.connect(d1).contribute({ value: GOAL - 1n });
      await time.increase(DURATION + 1);
      expect(await project.getStatus()).to.equal(FAILED);
    });
    it("échouée sans aucun don", async function () {
      const { project } = await loadFixture(deploy);
      await time.increase(DURATION + 1);
      expect(await project.getStatus()).to.equal(FAILED);
      expect(await project.getDonors()).to.deep.equal([]);
    });
  });

  describe("Demandes de retrait (F4)", function () {
    it("refuse un montant nul", async function () {
      const { project, creator, stranger } = await loadFixture(twoDonorsFixture);
      await expect(project.connect(creator).createWithdrawRequest(0, "x", stranger.address))
        .to.be.revertedWith("Montant invalide");
    });
    it("accepte un montant égal au solde exact", async function () {
      const { project, creator, stranger } = await loadFixture(twoDonorsFixture);
      await expect(project.connect(creator).createWithdrawRequest(eth("12"), "Tout", stranger.address))
        .to.emit(project, "WithdrawRequestCreated").withArgs(1, eth("12"), stranger.address, "Tout");
    });
    it("stocke le montant, le motif, le destinataire, 0 approbation et non exécutée", async function () {
      const { project, stranger } = await loadFixture(twoDonorsFixture);
      const [amount, reason, recipient, approvals, executed] = await project.withdrawRequests(0);
      expect(amount).to.equal(eth("4"));
      expect(reason).to.equal("Materiel");
      expect(recipient).to.equal(stranger.address);
      expect(approvals).to.equal(0);
      expect(executed).to.equal(false);
    });
  });

  describe("Seuil de 50 % (RG4)", function () {
    it("2 donateurs : 1 vote suffit (exactement 50 %)", async function () {
      const { project, creator, d1, stranger } = await loadFixture(twoDonorsFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0)).to.changeEtherBalance(stranger, eth("4"));
    });
    it("2 donateurs : aucun vote ne suffit pas", async function () {
      const { project, creator } = await loadFixture(twoDonorsFixture);
      await expect(project.connect(creator).withdrawRequestedAmount(0))
        .to.be.revertedWith("Moins de 50% d'approbation");
    });
    it("4 donateurs : 1 vote (25 %) est refusé", async function () {
      const { project, creator, d1 } = await loadFixture(fourDonorsFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0))
        .to.be.revertedWith("Moins de 50% d'approbation");
    });
    it("4 donateurs : 2 votes (50 %) sont acceptés", async function () {
      const { project, creator, d1, d2, stranger } = await loadFixture(fourDonorsFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0)).to.changeEtherBalance(stranger, eth("4"));
    });
    it("un vote ne compte que pour sa propre demande", async function () {
      const { project, creator, d1, d2, stranger } = await loadFixture(fourDonorsFixture);
      await project.connect(creator).createWithdrawRequest(eth("2"), "Autre", stranger.address);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);

      expect(await project.hasVoted(0, d1.address)).to.equal(true);
      expect(await project.hasVoted(1, d1.address)).to.equal(false);
      expect((await project.withdrawRequests(1)).approvals).to.equal(0);
      await expect(project.connect(creator).withdrawRequestedAmount(1))
        .to.be.revertedWith("Moins de 50% d'approbation");
    });
  });

  describe("Invariants après retrait", function () {
    it("le retrait ne change ni totalRaised ni le statut, seulement le solde", async function () {
      const { project, creator, d1 } = await loadFixture(twoDonorsFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(creator).withdrawRequestedAmount(0);

      expect(await project.totalRaised()).to.equal(eth("12"));
      expect(await project.getStatus()).to.equal(SUCCESSFUL);
      expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(eth("8"));
      expect((await project.withdrawRequests(0)).executed).to.equal(true);
    });
    it("plusieurs retraits peuvent vider le contrat, puis plus aucune demande n'est possible", async function () {
      const { project, creator, d1, stranger } = await loadFixture(twoDonorsFixture);
      await project.connect(creator).createWithdrawRequest(eth("8"), "Reste", stranger.address);
      for (const id of [0, 1]) {
        await project.connect(d1).voteWithdrawRequest(id);
        await project.connect(creator).withdrawRequestedAmount(id);
      }
      expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(0n);
      await expect(project.connect(creator).createWithdrawRequest(1n, "x", stranger.address))
        .to.be.revertedWith("Montant invalide");
    });
  });

  describe("Invariants après remboursement", function () {
    it("le remboursement remet la contribution à zéro sans toucher totalRaised ni la liste des donateurs", async function () {
      const { project, d1, d2 } = await loadFixture(failedFixture);
      await project.connect(d1).refund();

      expect(await project.contributions(d1.address)).to.equal(0n);
      expect(await project.contributions(d2.address)).to.equal(eth("2"));
      expect(await project.totalRaised()).to.equal(eth("3"));
      expect(await project.getDonors()).to.deep.equal([d1.address, d2.address]);
    });
    it("la campagne reste échouée une fois tout le monde remboursé", async function () {
      const { project, d1, d2 } = await loadFixture(failedFixture);
      await project.connect(d1).refund();
      await project.connect(d2).refund();
      expect(await project.getStatus()).to.equal(FAILED);
    });
    it("un donateur qui a donné plusieurs fois récupère la somme cumulée", async function () {
      const { project, d1 } = await loadFixture(deploy);
      await project.connect(d1).contribute({ value: eth("1") });
      await project.connect(d1).contribute({ value: eth("0.5") });
      await time.increase(DURATION + 1);
      const tx = project.connect(d1).refund();
      await expect(tx).to.emit(project, "Refunded").withArgs(d1.address, eth("1.5"));
      await expect(tx).to.changeEtherBalance(d1, eth("1.5"));
    });
  });
});
