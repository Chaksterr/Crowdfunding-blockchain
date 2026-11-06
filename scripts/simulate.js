// Simulation complète sans interface : joue le scénario A (succès) et B (échec).
// Usage : npm run node (terminal 1) puis npm run simulate (terminal 2)
// Chaque ligne [REFUSE] doit être un refus ATTENDU. Un refus attendu qui passe en [OK] = bug.
const { ethers, network } = require("hardhat");
const eth = ethers.parseEther;
const STATUS = ["En cours", "Echouee", "Reussie"];

async function tryCall(label, fn) {
  try { await fn(); console.log(`  [OK]      ${label}`); }
  catch (e) { console.log(`  [REFUSE]  ${label} -> ${e.reason || e.shortMessage || e.message}`); }
}
const tx = (p) => p.then((t) => t.wait());

async function advance(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function newProject(factory, creator, title, goal) {
  await tx(factory.connect(creator).createProject(title, "Simulation", eth(goal), eth("0.1"), 60));
  const list = await factory.getProjects();
  return ethers.getContractAt("Project", list[list.length - 1]);
}

async function scenarioA(factory, [creator, d1, d2, d3, recipient]) {
  console.log("\n=== SCENARIO A : campagne reussie (objectif 5 ETH) ===");
  const project = await newProject(factory, creator, "Demo A", "5");
  console.log("1. Dons");
  await tryCall("d1 donne 2 ETH", () => tx(project.connect(d1).contribute({ value: eth("2") })));
  await tryCall("d2 donne 2 ETH", () => tx(project.connect(d2).contribute({ value: eth("2") })));
  await tryCall("d3 donne 0.01 ETH (sous le minimum)", () => tx(project.connect(d3).contribute({ value: eth("0.01") })));
  await tryCall("d3 donne 2 ETH", () => tx(project.connect(d3).contribute({ value: eth("2") })));
  console.log("2. Retrait avant la fin (doit etre refuse)");
  await tryCall("createur demande un retrait", () => tx(project.connect(creator).createWithdrawRequest(eth("4"), "Materiel", recipient.address)));
  console.log("3. Avance du temps de 61 s");
  await advance(61);
  console.log("  Statut :", STATUS[Number(await project.getStatus())]);
  await tryCall("d1 donne apres la deadline", () => tx(project.connect(d1).contribute({ value: eth("1") })));
  console.log("4. Demande de retrait");
  await tryCall("d1 tente de creer une demande (pas createur)", () => tx(project.connect(d1).createWithdrawRequest(eth("4"), "x", d1.address)));
  await tryCall("createur demande 4 ETH", () => tx(project.connect(creator).createWithdrawRequest(eth("4"), "Materiel", recipient.address)));
  console.log("5. Votes (3 donateurs : il faut 2 votes)");
  await tryCall("d1 vote", () => tx(project.connect(d1).voteWithdrawRequest(0)));
  await tryCall("d1 revote (double vote)", () => tx(project.connect(d1).voteWithdrawRequest(0)));
  await tryCall("retrait avec 1 vote sur 3", () => tx(project.connect(creator).withdrawRequestedAmount(0)));
  await tryCall("d2 vote", () => tx(project.connect(d2).voteWithdrawRequest(0)));
  console.log("6. Retrait");
  const before = await ethers.provider.getBalance(recipient.address);
  await tryCall("retrait avec 2 votes sur 3", () => tx(project.connect(creator).withdrawRequestedAmount(0)));
  const after = await ethers.provider.getBalance(recipient.address);
  console.log("  Recu par le destinataire :", ethers.formatEther(after - before), "ETH");
  await tryCall("second retrait (double)", () => tx(project.connect(creator).withdrawRequestedAmount(0)));
}

async function scenarioB(factory, [creator, d1, d2, , stranger]) {
  console.log("\n=== SCENARIO B : campagne echouee (objectif 50 ETH) ===");
  const project = await newProject(factory, creator, "Demo B", "50");
  await tryCall("d1 donne 1 ETH", () => tx(project.connect(d1).contribute({ value: eth("1") })));
  await tryCall("d2 donne 2 ETH", () => tx(project.connect(d2).contribute({ value: eth("2") })));
  await tryCall("d1 se rembourse avant la deadline", () => tx(project.connect(d1).refund()));
  await advance(61);
  console.log("  Statut :", STATUS[Number(await project.getStatus())]);
  const b1 = await ethers.provider.getBalance(d1.address);
  await tryCall("d1 se rembourse", () => tx(project.connect(d1).refund()));
  const a1 = await ethers.provider.getBalance(d1.address);
  console.log("  d1 a recu environ :", ethers.formatEther(a1 - b1), "ETH (moins le gaz)");
  await tryCall("d1 se rembourse une 2e fois", () => tx(project.connect(d1).refund()));
  await tryCall("non-donateur se rembourse", () => tx(project.connect(stranger).refund()));
  await tryCall("d2 se rembourse", () => tx(project.connect(d2).refund()));
  console.log("  Solde du contrat :", ethers.formatEther(await ethers.provider.getBalance(await project.getAddress())), "ETH");
}

async function main() {
  const signers = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("Crowdfunding");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  await scenarioA(factory, signers);
  await scenarioB(factory, signers);
}
main().catch((e) => { console.error(e); process.exit(1); });
