const { expect } = require("chai");
const { ethers, ignition } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const eth = ethers.parseEther;

async function deployFactory() {
  const [alice, bob] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("Crowdfunding");
  const factory = await Factory.deploy();
  return { factory, alice, bob };
}

describe("Crowdfunding (fabrique)", function () {
  it("démarre sans projet", async function () {
    const { factory } = await loadFixture(deployFactory);
    expect(await factory.getProjectsCount()).to.equal(0);
  });

  it("crée un projet et émet ProjectCreated", async function () {
    const { factory, alice } = await loadFixture(deployFactory);
    await expect(factory.connect(alice).createProject("Titre", "Desc", eth("5"), eth("0.1"), 3600))
      .to.emit(factory, "ProjectCreated");
    expect(await factory.getProjectsCount()).to.equal(1);
  });

  it("le créateur du projet est l'appelant, pas la fabrique", async function () {
    const { factory, alice } = await loadFixture(deployFactory);
    await factory.connect(alice).createProject("Titre", "Desc", eth("5"), eth("0.1"), 3600);
    const [addr] = await factory.getProjects();
    const project = await ethers.getContractAt("Project", addr);
    expect(await project.creator()).to.equal(alice.address);
    expect(await project.title()).to.equal("Titre");
  });

  it("garde plusieurs projets de créateurs différents", async function () {
    const { factory, alice, bob } = await loadFixture(deployFactory);
    await factory.connect(alice).createProject("A", "d", eth("1"), eth("0.1"), 60);
    await factory.connect(bob).createProject("B", "d", eth("2"), eth("0.1"), 60);
    expect((await factory.getProjects()).length).to.equal(2);
  });

  it("propage les refus de validation du Project", async function () {
    const { factory, alice } = await loadFixture(deployFactory);
    await expect(factory.connect(alice).createProject("T", "d", 0, eth("0.1"), 60))
      .to.be.revertedWith("Objectif invalide");
  });

  it("propage aussi les refus sur le don minimum et la durée", async function () {
    const { factory, alice } = await loadFixture(deployFactory);
    await expect(factory.connect(alice).createProject("T", "d", eth("1"), 0, 60))
      .to.be.revertedWith("Don minimum invalide");
    await expect(factory.connect(alice).createProject("T", "d", eth("1"), eth("0.1"), 0))
      .to.be.revertedWith("Duree invalide");
    expect(await factory.getProjectsCount()).to.equal(0);
  });

  it("émet ProjectCreated avec l'adresse, le créateur, le titre, l'objectif et la deadline", async function () {
    const { factory, alice } = await loadFixture(deployFactory);
    // Un contrat commence au nonce 1 : la première campagne a une adresse prévisible
    const predicted = ethers.getCreateAddress({ from: await factory.getAddress(), nonce: 1 });
    const createdAt = (await time.latest()) + 100;
    await time.setNextBlockTimestamp(createdAt);

    await expect(factory.connect(alice).createProject("Titre", "Desc", eth("5"), eth("0.1"), 3600))
      .to.emit(factory, "ProjectCreated")
      .withArgs(predicted, alice.address, "Titre", eth("5"), createdAt + 3600);
  });

  it("renvoie l'adresse de la campagne créée", async function () {
    const { factory, alice } = await loadFixture(deployFactory);
    const returned = await factory.connect(alice).createProject.staticCall("T", "d", eth("1"), eth("0.1"), 60);
    await factory.connect(alice).createProject("T", "d", eth("1"), eth("0.1"), 60);
    expect(await factory.projects(0)).to.equal(returned);
  });

  it("enregistre tous les paramètres dans le Project créé", async function () {
    const { factory, alice } = await loadFixture(deployFactory);
    await factory.connect(alice).createProject("Titre", "Une description", eth("5"), eth("0.2"), 3600);
    const project = await ethers.getContractAt("Project", await factory.projects(0));
    expect(await project.description()).to.equal("Une description");
    expect(await project.goal()).to.equal(eth("5"));
    expect(await project.minContribution()).to.equal(eth("0.2"));
    expect(await project.deadline()).to.equal(BigInt(await time.latest()) + 3600n);
    expect(await project.totalRaised()).to.equal(0);
  });

  it("conserve l'ordre de création dans getProjects et projects(i)", async function () {
    const { factory, alice, bob } = await loadFixture(deployFactory);
    await factory.connect(alice).createProject("A", "d", eth("1"), eth("0.1"), 60);
    await factory.connect(bob).createProject("B", "d", eth("2"), eth("0.1"), 60);
    await factory.connect(alice).createProject("C", "d", eth("3"), eth("0.1"), 60);

    const list = await factory.getProjects();
    expect(list.length).to.equal(3);
    const titles = [];
    for (let i = 0; i < list.length; i++) {
      expect(await factory.projects(i)).to.equal(list[i]);
      titles.push(await (await ethers.getContractAt("Project", list[i])).title());
    }
    expect(titles).to.deep.equal(["A", "B", "C"]);
  });

  it("refuse la lecture d'un index hors limites", async function () {
    const { factory } = await loadFixture(deployFactory);
    await expect(factory.projects(0)).to.be.reverted;
  });

  it("le module Ignition déploie une fabrique vide et utilisable", async function () {
    const CrowdfundingModule = require("../ignition/modules/Crowdfunding");
    const { crowdfunding } = await ignition.deploy(CrowdfundingModule);
    expect(await crowdfunding.getProjectsCount()).to.equal(0);
    await crowdfunding.createProject("T", "d", eth("1"), eth("0.1"), 60);
    expect(await crowdfunding.getProjectsCount()).to.equal(1);
  });
});
