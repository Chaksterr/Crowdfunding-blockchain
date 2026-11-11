const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const eth = ethers.parseEther;
const DURATION = 3600;
const [ONGOING, FAILED, SUCCESSFUL] = [0n, 1n, 2n];

// Scénarios bout en bout : fabrique -> campagne -> dons -> issue.
async function deployFactory() {
  const [creator, d1, d2, d3, supplier, other] = await ethers.getSigners();
  const factory = await (await ethers.getContractFactory("Crowdfunding")).deploy();
  return { factory, creator, d1, d2, d3, supplier, other };
}

async function createProject(factory, signer, goal) {
  await factory.connect(signer).createProject("Campagne", "Desc", goal, eth("0.1"), DURATION);
  const addresses = await factory.getProjects();
  return ethers.getContractAt("Project", addresses[addresses.length - 1]);
}

describe("Cycle de vie complet via la fabrique", function () {
  it("campagne réussie : dons, demande, votes puis retrait vers le fournisseur", async function () {
    const { factory, creator, d1, d2, d3, supplier } = await loadFixture(deployFactory);
    const project = await createProject(factory, creator, eth("5"));

    await project.connect(d1).contribute({ value: eth("2") });
    await project.connect(d2).contribute({ value: eth("2") });
    await project.connect(d3).contribute({ value: eth("1") });
    expect(await project.getStatus()).to.equal(ONGOING);

    await time.increase(DURATION + 1);
    expect(await project.getStatus()).to.equal(SUCCESSFUL);

    await project.connect(creator).createWithdrawRequest(eth("3"), "Achat materiel", supplier.address);
    await project.connect(d1).voteWithdrawRequest(0);
    await project.connect(d3).voteWithdrawRequest(0);

    await expect(project.connect(creator).withdrawRequestedAmount(0))
      .to.changeEtherBalances([project, supplier], [-eth("3"), eth("3")]);
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(eth("2"));
    // Une campagne réussie ne rembourse jamais
    await expect(project.connect(d2).refund()).to.be.revertedWith("Remboursement impossible");
  });

  it("campagne échouée : chaque donateur récupère sa mise et aucun retrait n'est possible", async function () {
    const { factory, creator, d1, d2, supplier } = await loadFixture(deployFactory);
    const project = await createProject(factory, creator, eth("10"));

    await project.connect(d1).contribute({ value: eth("1") });
    await project.connect(d2).contribute({ value: eth("3") });
    await time.increase(DURATION + 1);
    expect(await project.getStatus()).to.equal(FAILED);

    await expect(project.connect(creator).createWithdrawRequest(eth("1"), "x", supplier.address))
      .to.be.revertedWith("Campagne non reussie");
    await expect(project.connect(d1).refund()).to.changeEtherBalance(d1, eth("1"));
    await expect(project.connect(d2).refund()).to.changeEtherBalance(d2, eth("3"));
    expect(await ethers.provider.getBalance(await project.getAddress())).to.equal(0n);
  });

  it("deux campagnes de la même fabrique ont des fonds et des donateurs séparés", async function () {
    const { factory, creator, d1, d2, other } = await loadFixture(deployFactory);
    const a = await createProject(factory, creator, eth("10"));
    const b = await createProject(factory, other, eth("1"));

    await a.connect(d1).contribute({ value: eth("2") });
    await b.connect(d2).contribute({ value: eth("1") });

    expect(await a.totalRaised()).to.equal(eth("2"));
    expect(await b.totalRaised()).to.equal(eth("1"));
    expect(await a.getDonors()).to.deep.equal([d1.address]);
    expect(await b.getDonors()).to.deep.equal([d2.address]);
    expect(await b.contributions(d1.address)).to.equal(0n);

    await time.increase(DURATION + 1);
    expect(await a.getStatus()).to.equal(FAILED);
    expect(await b.getStatus()).to.equal(SUCCESSFUL);

    // Le remboursement de A ne touche pas aux fonds de B
    await a.connect(d1).refund();
    expect(await ethers.provider.getBalance(await b.getAddress())).to.equal(eth("1"));
    // Et le créateur de A ne peut pas piloter B
    await expect(b.connect(creator).createWithdrawRequest(eth("1"), "x", creator.address))
      .to.be.revertedWith("Createur uniquement");
  });

  it("un donateur d'une autre campagne ne peut pas voter", async function () {
    const { factory, creator, d1, d2, supplier } = await loadFixture(deployFactory);
    const a = await createProject(factory, creator, eth("1"));
    const b = await createProject(factory, creator, eth("1"));

    await a.connect(d1).contribute({ value: eth("1") });
    await b.connect(d2).contribute({ value: eth("1") });
    await time.increase(DURATION + 1);
    await a.connect(creator).createWithdrawRequest(eth("1"), "x", supplier.address);

    await expect(a.connect(d2).voteWithdrawRequest(0)).to.be.revertedWith("Pas donateur");
  });
});
