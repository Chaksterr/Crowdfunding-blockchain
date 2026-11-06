const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

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
});
