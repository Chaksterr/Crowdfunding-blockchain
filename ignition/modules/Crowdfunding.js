const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Déploie la fabrique. Les Project sont créés ensuite par createProject().
module.exports = buildModule("CrowdfundingModule", (m) => {
  const crowdfunding = m.contract("Crowdfunding");
  return { crowdfunding };
});
