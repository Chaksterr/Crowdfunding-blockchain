// Données de démo : crée 3 campagnes et des dons pour l'interface web.
// Usage : npm run node (terminal 1) puis npm run deploy puis npm run seed (terminal 2)
// Repartir de zéro : npm run deploy:reset puis npm run seed
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const { ethers, network } = hre;

const STATUS = ["En cours", "Échouée", "Réussie"]; // 0, 1, 2 (voir Project.sol)
const DETERMINISTIC_FACTORY = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Cherche l'adresse de la fabrique : env, puis déploiement Ignition, puis adresse déterministe.
function latestDeploymentFile() {
  const root = path.join(__dirname, "..", "ignition", "deployments");
  if (!fs.existsSync(root)) return null;

  const candidates = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chain-"))
    .map((entry) => path.join(root, entry.name, "deployed_addresses.json"))
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  return candidates[0] ?? null;
}

function resolveFactoryAddress() {
  if (process.env.FACTORY_ADDRESS) return process.env.FACTORY_ADDRESS;

  const deployed = latestDeploymentFile();
  if (deployed) {
    const addresses = JSON.parse(fs.readFileSync(deployed, "utf8"));
    const address = addresses["CrowdfundingModule#Crowdfunding"];
    if (address) return address;
  }

  return DETERMINISTIC_FACTORY;
}

const tx = (p) => p.then((t) => t.wait());

async function advance(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

// Récupère l'adresse du Project créé depuis l'événement ProjectCreated.
function projectFromReceipt(factory, receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed && parsed.name === "ProjectCreated") return parsed.args.project;
    } catch (_) {
      // Log d'un autre contrat : on ignore.
    }
  }
  return null;
}

async function createCampaign(factory, signer, spec) {
  const transaction = await factory
    .connect(signer)
    .createProject(
      spec.title,
      spec.description,
      ethers.parseEther(spec.goal),
      ethers.parseEther(spec.minContribution),
      spec.duration
    );
  const receipt = await transaction.wait();

  let address = projectFromReceipt(factory, receipt);
  if (!address) {
    // Repli : le dernier projet de la liste.
    const list = await factory.getProjects();
    address = list[list.length - 1];
  }
  return ethers.getContractAt("Project", address);
}

async function donate(project, signer, amountEth) {
  await tx(project.connect(signer).contribute({ value: ethers.parseEther(amountEth) }));
}

async function describe(label, project) {
  const [goal, totalRaised, status, timeLeft, donors] = await Promise.all([
    project.goal(),
    project.totalRaised(),
    project.getStatus(),
    project.timeLeft(),
    project.getDonors(),
  ]);
  return {
    label,
    address: await project.getAddress(),
    status: STATUS[Number(status)],
    raised: `${ethers.formatEther(totalRaised)} / ${ethers.formatEther(goal)} ETH`,
    donors: donors.length,
    timeLeft: Number(timeLeft) === 0 ? "0 s (terminée)" : `${Number(timeLeft)} s`,
  };
}

function printTable(rows) {
  const cols = [
    ["Campagne", 32],
    ["Adresse", 44],
    ["Statut", 10],
    ["Collecté / Objectif", 24],
    ["Donateurs", 10],
    ["Temps restant", 18],
  ];
  const line = cols.map(([, w]) => "-".repeat(w)).join("  ");
  const header = cols.map(([h, w]) => h.padEnd(w)).join("  ");

  console.log("\n" + "=".repeat(header.length));
  console.log("  DONNÉES DE DÉMO — 3 CAMPAGNES");
  console.log("=".repeat(header.length));
  console.log(header);
  console.log(line);
  for (const r of rows) {
    console.log(
      [
        r.label.padEnd(32),
        r.address.padEnd(44),
        r.status.padEnd(10),
        r.raised.padEnd(24),
        String(r.donors).padEnd(10),
        r.timeLeft.padEnd(18),
      ].join("  ")
    );
  }
  console.log(line);
  console.log(
    "Rappel : « En cours » = 0, « Échouée » = 1, « Réussie » = 2 (getStatus()).\n"
  );
}

async function main() {
  const signers = await ethers.getSigners();
  const [creator, donor1, donor2, donor3] = signers;

  const factoryAddress = resolveFactoryAddress();
  console.log("Fabrique Crowdfunding :", factoryAddress);

  const factory = await ethers.getContractAt("Crowdfunding", factoryAddress);

  const existing = await factory.getProjectsCount();
  if (existing > 0n) {
    console.log(
      `\n⚠️  La fabrique contient déjà ${existing} campagne(s). Aucune donnée n'a été créée.`
    );
    console.log("Pour repartir d'une base propre :");
    console.log("  1. npm run deploy:reset");
    console.log("  2. npm run seed");
    return;
  }

  console.log("Création des campagnes…");

  // A. Reste « En cours » après le saut de temps (durée 1800 s).
  const campaignA = await createCampaign(factory, creator, {
    title: "Atelier vélo solidaire",
    description:
      "Un atelier de réparation de vélos ouvert aux étudiants : outils, pièces et accompagnement.",
    goal: "5",
    minContribution: "0.1",
    duration: 1800,
  });
  await donate(campaignA, donor1, "0.5");

  // B. Devient « Réussie » : 2 + 2 + 1 = 5 ETH pour un objectif de 5 ETH (durée 600 s).
  const campaignB = await createCampaign(factory, creator, {
    title: "Album photo des étudiants",
    description: "Un album souvenir de l'année, imprimé et distribué sur le campus.",
    goal: "5",
    minContribution: "0.5",
    duration: 600,
  });
  await donate(campaignB, donor1, "2");
  await donate(campaignB, donor2, "2");
  await donate(campaignB, donor3, "1");

  // C. Devient « Échouée » : 1 + 2 = 3 ETH pour un objectif de 50 ETH (durée 600 s).
  const campaignC = await createCampaign(factory, creator, {
    title: "Serre connectée du campus",
    description:
      "Une serre automatisée pour le potager pédagogique : capteurs, irrigation et éclairage.",
    goal: "50",
    minContribution: "0.5",
    duration: 600,
  });
  await donate(campaignC, donor1, "1");
  await donate(campaignC, donor2, "2");

  // Saut de temps : B (600 s) et C (600 s) sont terminées, A (1800 s) reste ouverte.
  console.log("Avance du temps de 700 s…");
  await advance(700);

  // Vérification des états attendus.
  const checks = [
    ["A", campaignA, 0n],
    ["B", campaignB, 2n],
    ["C", campaignC, 1n],
  ];
  for (const [label, project, expected] of checks) {
    const status = await project.getStatus();
    if (status !== expected) {
      throw new Error(
        `Campagne ${label} : statut ${status} inattendu (attendu ${expected}).`
      );
    }
  }

  const rows = [
    await describe("A · Atelier vélo solidaire", campaignA),
    await describe("B · Album photo des étudiants", campaignB),
    await describe("C · Serre connectée du campus", campaignC),
  ];
  printTable(rows);

  console.log("Prochaine étape : npm run sync puis lancer le frontend (npm run dev).");
}

main().catch((e) => {
  console.error("\n❌ Échec du seed :", e.reason || e.shortMessage || e.message);
  process.exit(1);
});
