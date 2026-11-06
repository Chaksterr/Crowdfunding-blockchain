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

const deployed = path.join(root, "ignition", "deployments", "chain-31337", "deployed_addresses.json");
if (fs.existsSync(deployed)) {
  const address = JSON.parse(fs.readFileSync(deployed, "utf8"))["CrowdfundingModule#Crowdfunding"];
  fs.writeFileSync(path.join(root, "frontend", "src", "deployed.json"), JSON.stringify({ address }, null, 2));
  console.log("Adresse de la fabrique :", address);
} else {
  console.log("Pas encore de déploiement : lancez npm run deploy puis npm run sync");
}
