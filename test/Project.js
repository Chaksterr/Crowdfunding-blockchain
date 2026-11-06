const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const eth = ethers.parseEther;
const DURATION = 3600;
const [ONGOING, FAILED, SUCCESSFUL] = [0n, 1n, 2n];

// Fixtures : chacune est indépendante (on n'appelle pas loadFixture à l'intérieur)
async function deploy() {
  const [creator, d1, d2, d3, stranger] = await ethers.getSigners();
  const Project = await ethers.getContractFactory("Project");
  const project = await Project.deploy(creator.address, "Titre", "Desc", eth("10"), eth("0.1"), DURATION);
  return { project, Project, creator, d1, d2, d3, stranger };
}

async function ongoingFixture() {
  return deploy();
}

async function successfulFixture() { // 11 ETH >= 10 ETH, 3 donateurs
  const c = await deploy();
  await c.project.connect(c.d1).contribute({ value: eth("6") });
  await c.project.connect(c.d2).contribute({ value: eth("3") });
  await c.project.connect(c.d3).contribute({ value: eth("2") });
  await time.increase(DURATION + 1);
  return c;
}

async function failedFixture() { // 3 ETH < 10 ETH
  const c = await deploy();
  await c.project.connect(c.d1).contribute({ value: eth("1") });
  await c.project.connect(c.d2).contribute({ value: eth("2") });
  await time.increase(DURATION + 1);
  return c;
}

async function withRequestFixture() {
  const c = await successfulFixture();
  await c.project.connect(c.creator).createWithdrawRequest(eth("5"), "Materiel", c.stranger.address);
  return c;
}

describe("Project", function () {
  describe("Déploiement (RG1)", function () {
    it("enregistre les paramètres", async function () {
      const { project, creator } = await loadFixture(ongoingFixture);
      expect(await project.creator()).to.equal(creator.address);
      expect(await project.goal()).to.equal(eth("10"));
      expect(await project.minContribution()).to.equal(eth("0.1"));
      expect(await project.getStatus()).to.equal(ONGOING);
    });
    it("refuse un objectif nul", async function () {
      const { Project, creator } = await loadFixture(ongoingFixture);
      await expect(Project.deploy(creator.address, "t", "d", 0, eth("0.1"), DURATION))
        .to.be.revertedWith("Objectif invalide");
    });
    it("refuse un don minimum nul", async function () {
      const { Project, creator } = await loadFixture(ongoingFixture);
      await expect(Project.deploy(creator.address, "t", "d", eth("1"), 0, DURATION))
        .to.be.revertedWith("Don minimum invalide");
    });
    it("refuse une durée nulle", async function () {
      const { Project, creator } = await loadFixture(ongoingFixture);
      await expect(Project.deploy(creator.address, "t", "d", eth("1"), eth("0.1"), 0))
        .to.be.revertedWith("Duree invalide");
    });
    it("refuse un créateur à l'adresse nulle", async function () {
      const { Project } = await loadFixture(ongoingFixture);
      await expect(Project.deploy(ethers.ZeroAddress, "t", "d", eth("1"), eth("0.1"), DURATION))
        .to.be.revertedWith("Createur invalide");
    });
  });

  describe("Dons (F2, RG2)", function () {
    it("accepte un don et émet l'événement", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      await expect(project.connect(d1).contribute({ value: eth("1") }))
        .to.emit(project, "DonationReceived").withArgs(d1.address, eth("1"));
      expect(await project.totalRaised()).to.equal(eth("1"));
    });
    it("n'ajoute pas deux fois le même donateur", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      await project.connect(d1).contribute({ value: eth("1") });
      await project.connect(d1).contribute({ value: eth("1") });
      expect((await project.getDonors()).length).to.equal(1);
      expect(await project.contributions(d1.address)).to.equal(eth("2"));
    });
    it("refuse un don sous le minimum", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      await expect(project.connect(d1).contribute({ value: eth("0.01") }))
        .to.be.revertedWith("Don trop faible");
    });
    it("refuse un don après la deadline", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      await time.increase(DURATION + 1);
      await expect(project.connect(d1).contribute({ value: eth("1") }))
        .to.be.revertedWith("Campagne terminee");
    });
    it("refuse un envoi direct d'ETH (pas de receive)", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      await expect(d1.sendTransaction({ to: await project.getAddress(), value: eth("1") })).to.be.reverted;
    });
  });

  describe("États et temps (F3, RG3)", function () {
    it("réussie si total >= objectif après la deadline", async function () {
      const { project } = await loadFixture(successfulFixture);
      expect(await project.getStatus()).to.equal(SUCCESSFUL);
    });
    it("échouée si total < objectif après la deadline", async function () {
      const { project } = await loadFixture(failedFixture);
      expect(await project.getStatus()).to.equal(FAILED);
    });
    it("reste en cours même si l'objectif est atteint avant la deadline", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      await project.connect(d1).contribute({ value: eth("10") });
      expect(await project.getStatus()).to.equal(ONGOING);
    });
    it("timeLeft diminue puis vaut 0", async function () {
      const { project } = await loadFixture(ongoingFixture);
      expect(await project.timeLeft()).to.be.gt(0n);
      await time.increase(DURATION + 1);
      expect(await project.timeLeft()).to.equal(0n);
    });
  });

  describe("Demande de retrait (F4)", function () {
    it("refuse si la campagne n'est pas réussie", async function () {
      const { project, creator, stranger } = await loadFixture(failedFixture);
      await expect(project.connect(creator).createWithdrawRequest(eth("1"), "x", stranger.address))
        .to.be.revertedWith("Campagne non reussie");
    });
    it("refuse avant la deadline", async function () {
      const { project, creator, d1, stranger } = await loadFixture(ongoingFixture);
      await project.connect(d1).contribute({ value: eth("10") });
      await expect(project.connect(creator).createWithdrawRequest(eth("1"), "x", stranger.address))
        .to.be.revertedWith("Campagne non reussie");
    });
    it("refuse si l'appelant n'est pas le créateur", async function () {
      const { project, d1, stranger } = await loadFixture(successfulFixture);
      await expect(project.connect(d1).createWithdrawRequest(eth("1"), "x", stranger.address))
        .to.be.revertedWith("Createur uniquement");
    });
    it("refuse un montant supérieur au solde", async function () {
      const { project, creator, stranger } = await loadFixture(successfulFixture);
      await expect(project.connect(creator).createWithdrawRequest(eth("12"), "x", stranger.address))
        .to.be.revertedWith("Montant invalide");
    });
    it("refuse un destinataire nul", async function () {
      const { project, creator } = await loadFixture(successfulFixture);
      await expect(project.connect(creator).createWithdrawRequest(eth("1"), "x", ethers.ZeroAddress))
        .to.be.revertedWith("Destinataire invalide");
    });
    it("crée la demande et émet l'événement", async function () {
      const { project, creator, stranger } = await loadFixture(successfulFixture);
      await expect(project.connect(creator).createWithdrawRequest(eth("5"), "Materiel", stranger.address))
        .to.emit(project, "WithdrawRequestCreated").withArgs(0, eth("5"), stranger.address, "Materiel");
      expect(await project.getWithdrawRequestsCount()).to.equal(1);
    });
  });

  describe("Vote et retrait (F5, RG4)", function () {
    it("enregistre un vote et émet l'événement", async function () {
      const { project, d1 } = await loadFixture(withRequestFixture);
      await expect(project.connect(d1).voteWithdrawRequest(0))
        .to.emit(project, "WithdrawVote").withArgs(0, d1.address);
      expect((await project.withdrawRequests(0)).approvals).to.equal(1);
    });
    it("refuse le vote d'un non-donateur", async function () {
      const { project, stranger } = await loadFixture(withRequestFixture);
      await expect(project.connect(stranger).voteWithdrawRequest(0)).to.be.revertedWith("Pas donateur");
    });
    it("refuse le double vote", async function () {
      const { project, d1 } = await loadFixture(withRequestFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await expect(project.connect(d1).voteWithdrawRequest(0)).to.be.revertedWith("Deja vote");
    });
    it("refuse un vote sur une demande inexistante", async function () {
      const { project, d1 } = await loadFixture(withRequestFixture);
      await expect(project.connect(d1).voteWithdrawRequest(99)).to.be.revertedWith("Demande inexistante");
    });
    it("refuse le retrait sous 50 % (1 vote sur 3)", async function () {
      const { project, creator, d1 } = await loadFixture(withRequestFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0))
        .to.be.revertedWith("Moins de 50% d'approbation");
    });
    it("accepte le retrait à partir de 50 % (2 votes sur 3)", async function () {
      const { project, creator, d1, d2, stranger } = await loadFixture(withRequestFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0))
        .to.changeEtherBalance(stranger, eth("5"));
    });
    it("émet FundsWithdrawn", async function () {
      const { project, creator, d1, d2, stranger } = await loadFixture(withRequestFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0))
        .to.emit(project, "FundsWithdrawn").withArgs(0, eth("5"), stranger.address);
    });
    it("refuse un second retrait de la même demande", async function () {
      const { project, creator, d1, d2 } = await loadFixture(withRequestFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);
      await project.connect(creator).withdrawRequestedAmount(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0)).to.be.revertedWith("Deja execute");
    });
    it("refuse le vote sur une demande déjà exécutée", async function () {
      const { project, creator, d1, d2, d3 } = await loadFixture(withRequestFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);
      await project.connect(creator).withdrawRequestedAmount(0);
      await expect(project.connect(d3).voteWithdrawRequest(0)).to.be.revertedWith("Deja execute");
    });
    it("refuse le retrait par un non-créateur", async function () {
      const { project, d1, d2 } = await loadFixture(withRequestFixture);
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);
      await expect(project.connect(d1).withdrawRequestedAmount(0)).to.be.revertedWith("Createur uniquement");
    });
    it("refuse le retrait d'une demande inexistante", async function () {
      const { project, creator } = await loadFixture(withRequestFixture);
      await expect(project.connect(creator).withdrawRequestedAmount(42)).to.be.revertedWith("Demande inexistante");
    });
    it("refuse le cumul de demandes au-delà du solde", async function () {
      const { project, creator, d1, d2, stranger } = await loadFixture(withRequestFixture);
      // Solde 11 ETH : 2e demande de 8 ETH acceptée à la création (<= solde)...
      await project.connect(creator).createWithdrawRequest(eth("8"), "Autre", stranger.address);
      for (const id of [0, 1]) {
        await project.connect(d1).voteWithdrawRequest(id);
        await project.connect(d2).voteWithdrawRequest(id);
      }
      await project.connect(creator).withdrawRequestedAmount(0); // 5 ETH sortis, reste 6
      // ... mais le retrait de 8 ETH doit échouer au moment de l'exécution
      await expect(project.connect(creator).withdrawRequestedAmount(1)).to.be.revertedWith("Solde insuffisant");
    });
  });

  describe("Remboursement (F6, RG5)", function () {
    it("rembourse exactement la contribution", async function () {
      const { project, d1 } = await loadFixture(failedFixture);
      await expect(project.connect(d1).refund()).to.changeEtherBalance(d1, eth("1"));
    });
    it("émet l'événement Refunded", async function () {
      const { project, d2 } = await loadFixture(failedFixture);
      await expect(project.connect(d2).refund()).to.emit(project, "Refunded").withArgs(d2.address, eth("2"));
    });
    it("refuse un second remboursement", async function () {
      const { project, d1 } = await loadFixture(failedFixture);
      await project.connect(d1).refund();
      await expect(project.connect(d1).refund()).to.be.revertedWith("Rien a rembourser");
    });
    it("refuse le remboursement d'un non-donateur", async function () {
      const { project, stranger } = await loadFixture(failedFixture);
      await expect(project.connect(stranger).refund()).to.be.revertedWith("Rien a rembourser");
    });
    it("refuse le remboursement si la campagne réussit", async function () {
      const { project, d1 } = await loadFixture(successfulFixture);
      await expect(project.connect(d1).refund()).to.be.revertedWith("Remboursement impossible");
    });
    it("refuse le remboursement avant la deadline", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      await project.connect(d1).contribute({ value: eth("1") });
      await expect(project.connect(d1).refund()).to.be.revertedWith("Remboursement impossible");
    });
    it("vide le contrat quand tout le monde est remboursé", async function () {
      const { project, d1, d2 } = await loadFixture(failedFixture);
      await project.connect(d1).refund();
      await project.connect(d2).refund();
      expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(0n);
    });
  });

  describe("Sécurité (réentrance et virements refusés)", function () {
    it("bloque une attaque par réentrance sur refund()", async function () {
      const { project, d1 } = await loadFixture(ongoingFixture);
      const attacker = await (await ethers.getContractFactory("ReentrancyAttacker")).deploy(await project.getAddress());
      await project.connect(d1).contribute({ value: eth("2") });
      await attacker.donate({ value: eth("1") });
      await time.increase(DURATION + 1); // 3 ETH < 10 ETH : campagne échouée

      await expect(attacker.attack()).to.changeEtherBalances([attacker, project], [eth("1"), -eth("1")]);
      expect(await attacker.reentryAttempted()).to.equal(true);
      expect(await attacker.reentrySucceeded()).to.equal(false);
      // La mise de d1 est intacte et toujours remboursable
      expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(eth("2"));
      await expect(project.connect(d1).refund()).to.changeEtherBalance(d1, eth("2"));
    });
    it("annule le remboursement si le donateur refuse l'ETH (contribution conservée)", async function () {
      const { project } = await loadFixture(ongoingFixture);
      const rejecter = await (await ethers.getContractFactory("RejectingReceiver")).deploy();
      await rejecter.donate(await project.getAddress(), { value: eth("1") });
      await time.increase(DURATION + 1);
      await expect(rejecter.claimRefund(await project.getAddress())).to.be.revertedWith("Echec du remboursement");
      expect(await project.contributions(await rejecter.getAddress())).to.equal(eth("1"));
    });
    it("annule le retrait si le destinataire refuse l'ETH (demande non exécutée)", async function () {
      const { project, creator, d1, d2 } = await loadFixture(successfulFixture);
      const rejecter = await (await ethers.getContractFactory("RejectingReceiver")).deploy();
      await project.connect(creator).createWithdrawRequest(eth("5"), "Materiel", await rejecter.getAddress());
      await project.connect(d1).voteWithdrawRequest(0);
      await project.connect(d2).voteWithdrawRequest(0);
      await expect(project.connect(creator).withdrawRequestedAmount(0)).to.be.revertedWith("Echec du virement");
      expect((await project.withdrawRequests(0)).executed).to.equal(false);
    });
  });
});
