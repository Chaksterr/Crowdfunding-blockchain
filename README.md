# Plateforme de financement participatif (Smart Contracts)

📋 **Avancement et tâches de l'équipe : [ROADMAP.md](ROADMAP.md)**

## Prérequis
Node.js 18+, Git, MetaMask.

## Installation et Tests (Phase 1)
```bash
npm install
npm run compile
npm test
```

## Déploiement local (Phase 4)
- **Terminal 1** (laisser ouvert) : `npm run node`
- **Terminal 2** : `npm run deploy`
- Après un redémarrage du node : `npm run deploy:reset`

## Outils de démo et Intégration
- `SECONDS=120 npm run ff` : avance le temps de la blockchain locale
- `npm run simulate` : joue les scénarios complets A (succès) et B (échec)
- `npm run sync` : exporte les ABI et l'adresse déployée vers le frontend

## Documentation complète
Pour une documentation pas-à-pas détaillée et prête pour l'équipe Frontend :
- 📖 [Guide de validation, MetaMask & Frontend](docs/GUIDE_METAMASK_HARDHAT.md)
- 📜 [Explication pas-à-pas des Smart Contracts](docs/EXPLICATION_SMART_CONTRACTS.md)
- 📘 [Documentation technique détaillée](docs/README.md)
- 📙 [Spécifications et Référence](docs/Reference.md)

## Structure
- `contracts/` : `Crowdfunding.sol`, `Project.sol` (+ `contracts/test/` : contrats d'attaque pour les tests)
- `test/` : `Crowdfunding.js`, `Project.js`
- `ignition/modules/` : `Crowdfunding.js`
- `scripts/` : `fastForward.js`, `simulate.js`, `syncAbi.js`
- `docs/` : guides complets, spécifications et cahier des charges
- `.github/workflows/ci.yml` : compile et teste à chaque Pull Request
