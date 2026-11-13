// Copie les ABI et l'adresse déployée vers le front.
// Usage : npm run compile && npm run deploy && npm run sync
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "frontend", "src", "abi");
fs.mkdirSync(out, { recursive: true });

for (const [file, name] of [["Crowdfunding.sol", "Crowdfunding"], ["Project.sol", "Project"]]) {
  const artifact = path.join(root, "artifacts", "contracts", file, `${name}.json`);
  const { abi } = JSON.parse(fs.readFileSync(artifact, "utf8"));
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(abi, null, 2));
  console.log(`ABI ${name} copiée`);
}

// Ignition nomme chaque déploiement d'après sa chaîne (`chain-<chainId>`).
// On prend le plus récent au lieu de coder un numéro de chaîne en dur : changer
// le chainId du projet ne casse alors plus la synchronisation.
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

const deployed = latestDeploymentFile();
if (deployed) {
  const address = JSON.parse(fs.readFileSync(deployed, "utf8"))["CrowdfundingModule#Crowdfunding"];
  fs.writeFileSync(path.join(root, "frontend", "src", "deployed.json"), JSON.stringify({ address }, null, 2));
  console.log("Adresse de la fabrique :", address);
} else {
  console.log("Pas encore de déploiement : lancez npm run deploy puis npm run sync");
}
