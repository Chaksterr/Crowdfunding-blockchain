// Avance l'horloge de la blockchain locale. Usage : SECONDS=120 npm run ff
const { network } = require("hardhat");

async function main() {
  const seconds = Number(process.env.SECONDS || 3600);
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
  console.log(`Temps avancé de ${seconds}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
