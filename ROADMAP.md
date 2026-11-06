# Roadmap — Crowdfunding DApp

> **Livraison : dimanche 8 novembre 2026** · Équipe de 4 · Mettre à jour ce fichier à chaque tâche terminée (`[ ]` → `[x]`) via une Pull Request.

## Avancement

| Phase | Contenu | Responsable | Échéance | État |
| --- | --- | --- | --- | --- |
| 1 | Smart contracts, tests, déploiement, dépôt GitHub | Étudiant 1 | ven. 6 nov | ✅ Terminé (reste : push + invitations) |
| 2 | Interface React (pages, composants) | Étudiant 2 | sam. 7 nov | ⏳ À faire |
| 2 | Intégration Web3 (MetaMask, ethers, Redux, événements) | Étudiant 3 | sam. 7 nov | ⏳ À faire |
| 2 | Déploiement, données de démo, recette, multi-PC | Étudiant 4 | sam. 7 nov | ⏳ À faire |
| 3 | Rapport + présentation + répétition démo | **Tous** | dim. 8 nov | ⏳ À faire |

---

## Phase 1 — Smart contracts et dépôt GitHub (Étudiant 1) ✅

Vérifié le 6 nov. 2026 : **47 tests réussis**, couverture **100 %** (lignes et branches) sur `Crowdfunding.sol` et `Project.sol`, déploiement Ignition et `npm run simulate` OK.

- [x] `Crowdfunding.sol` : fabrique (`createProject`, `getProjects`, `getProjectsCount`, événement `ProjectCreated`)
- [x] `Project.sol` : F2 donner, F3 consulter, F4 demande de retrait, F5 vote ≥ 50 % + retrait, F6 remboursement
- [x] Règles RG1 à RG5 appliquées et testées
- [x] Sécurité : anti-réentrance (testée avec un contrat attaquant), anti double vote, `onlyCreator`, virement refusé = annulation
- [x] Tests Mocha/Chai (`test/`) + contrats de test (`contracts/test/`)
- [x] Déploiement Hardhat Ignition (`ignition/modules/Crowdfunding.js`)
- [x] Scripts : `simulate` (scénarios A et B), `ff` (avance le temps), `sync` (ABI → frontend)
- [x] CI GitHub Actions (`.github/workflows/ci.yml`) : compile + tests à chaque PR
- [x] Premier commit
- [ ] Créer le dépôt sur GitHub et pousser `main`
- [ ] Inviter les 3 collaborateurs (Settings → Collaborators)
- [ ] Protéger `main` (Settings → Branches : PR obligatoire + CI verte)

**ABI gelée** : les noms de fonctions et d'événements ne changent plus. Référence pour le front :

| Contrat | Écriture | Lecture | Événements |
| --- | --- | --- | --- |
| `Crowdfunding` | `createProject(title, description, goal, minContribution, duration)` | `getProjects()`, `getProjectsCount()` | `ProjectCreated` |
| `Project` | `contribute()` *(payable)*, `createWithdrawRequest(amount, reason, recipient)`, `voteWithdrawRequest(id)`, `withdrawRequestedAmount(id)`, `refund()` | `creator`, `title`, `description`, `goal`, `minContribution`, `deadline`, `totalRaised`, `contributions(addr)`, `getDonors()`, `getStatus()` *(0 En cours, 1 Échouée, 2 Réussie)*, `timeLeft()`, `withdrawRequests(id)`, `getWithdrawRequestsCount()`, `hasVoted(id, addr)` | `DonationReceived`, `WithdrawRequestCreated`, `WithdrawVote`, `FundsWithdrawn`, `Refunded` |

Montants en **wei** (`ethers.parseEther` / `formatEther`), durée en **secondes**.

---

## Phase 2 — Interface web (samedi 7 novembre)

Les 3 étudiants travaillent en parallèle dans `frontend/`. Étudiant 3 fournit les fonctions, Étudiant 2 les affiche, Étudiant 4 prépare l'environnement et teste.

### Étudiant 2 — Interface graphique (React + Tailwind)

- [ ] Créer le projet : `npm create vite@latest frontend -- --template react`, installer Tailwind CSS
- [ ] Barre du haut : bouton « Connecter MetaMask », adresse et solde du compte connecté
- [ ] Page **Accueil** : cartes des campagnes (titre, objectif, total collecté, barre de progression, temps restant, état)
- [ ] Page **Créer une campagne** (F1) : titre, description, objectif (ETH), don minimum (ETH), durée (minutes)
- [ ] Page **Détail** (F3) : toutes les infos + liste des donateurs + historique
- [ ] Bouton **Donner** (F2) avec champ montant
- [ ] Section **Demandes de retrait** : formulaire (créateur seulement, si Réussie), liste avec barre de votes, boutons **Voter** et **Retirer** (F4, F5)
- [ ] Bouton **Rembourser** (F6) visible pour un donateur si Échouée
- [ ] Messages de succès / erreur (toast) et états de chargement
- [ ] Affichage correct sur téléphone et ordinateur

### Étudiant 3 — Intégration Web3 (ethers.js v6 + Redux Toolkit)

- [ ] Installer `ethers` et `@reduxjs/toolkit react-redux` dans `frontend/`
- [ ] `src/web3/provider.js` : `BrowserProvider(window.ethereum)` pour écrire, `JsonRpcProvider(import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545")` pour lire sans wallet (visiteur)
- [ ] Vérifier la chaîne 31337 et proposer `wallet_switchEthereumChain` / `wallet_addEthereumChain`
- [ ] Réagir à `accountsChanged` et `chainChanged`
- [ ] `src/web3/contracts.js` : instances à partir de `src/abi/*.json` et `src/deployed.json` (générés par `npm run sync`)
- [ ] Fonctions : `loadProjects()`, `loadProject(addr)`, `createProject()`, `donate()`, `createRequest()`, `vote()`, `withdraw()`, `refund()`
- [ ] Store Redux : `walletSlice` (compte, chaîne), `projectsSlice` (liste + détail)
- [ ] Écoute des événements (`DonationReceived`, `WithdrawVote`, …) → rafraîchissement automatique
- [ ] Traduire les erreurs `require` du contrat en messages lisibles (ex. « Don trop faible » → « Le montant est sous le minimum »)

### Étudiant 4 — Déploiement, démo et recette

- [ ] Script `scripts/seedDemo.js` (+ `npm run seed`) : crée 2 campagnes avec des dons (une qui réussira, une qui échouera)
- [ ] Fichier `frontend/.env.example` avec `VITE_RPC_URL=http://127.0.0.1:8545`
- [ ] Ajouter `npm ci` + `npm run build` du frontend dans `.github/workflows/ci.yml`
- [ ] Guide MetaMask : réseau 31337, import de 4 comptes (Créateur, Donateur 1/2/3), « Effacer les données d'activité » après chaque redémarrage du node
- [ ] Mode **multi-PC** : `npx hardhat node --hostname 0.0.0.0` + `npm run dev -- --host`, tester depuis un 2ᵉ PC
- [ ] Recette : jouer les scénarios ci-dessous dans l'interface, ouvrir une issue par bug

| # | Scénario | Résultat attendu | OK ? |
| --- | --- | --- | --- |
| A | Objectif 5 ETH, 3 dons de 2 ETH, fin, demande 4 ETH, 2 votes / 3, retrait | Réussie, destinataire +4 ETH | [ ] |
| B | Objectif 50 ETH, dons 1 + 2 ETH, fin, remboursements | Échouée, chacun récupère sa mise, contrat à 0 | [ ] |
| C | Don sous le minimum / après la fin | Refusé avec message clair | [ ] |
| D | Retrait avec 1 vote sur 3 | Refusé | [ ] |
| E | Double vote, double remboursement, retrait par un non-créateur | Refusés | [ ] |
| F | Navigateur sans MetaMask | Lecture OK, boutons d'action masqués | [ ] |

**Contrôle fin de phase 2 :** les scénarios A et B se jouent entièrement dans le navigateur.

---

## Phase 3 — Rapport et présentation, tous ensemble (dimanche 8 novembre)

Chacun écrit la partie qu'il a codée ; on assemble et on relit ensemble.

### Rapport (`docs/rapport/`)

| Chapitre | Contenu | Rédacteur |
| --- | --- | --- |
| Introduction + contexte | Crowdfunding classique vs smart contract, blockchain, Ethereum, gas, wallet | Ensemble |
| Spécifications | Acteurs, F1–F7, RG1–RG5 (+ précisions ci-dessous) | Étudiant 1 |
| Smart contracts et sécurité | Fabrique/Project, états, vote 50 %, réentrance, tests | Étudiant 1 |
| Interface | Pages, captures d'écran | Étudiant 2 |
| Intégration Web3 | MetaMask, ethers, Redux, événements | Étudiant 3 |
| Déploiement et tests | Ignition, CI, recette, multi-PC | Étudiant 4 |
| Conclusion | Bilan, limites, perspectives (Sepolia, vote pondéré, IPFS) | Ensemble |

Précisions à indiquer par rapport au cahier des charges :
- l'état n'est pas stocké mais calculé par `getStatus()` (toujours exact) ;
- le créateur saisit une **durée**, la date limite = création + durée ;
- vote : **une voix par donateur**, seuil inclusif (2 sur 4 suffit) ;
- après la date limite, les fonds ne sortent que par retrait voté ou remboursement ;
- ajout de la fabrique `Crowdfunding.sol` et de `getWithdrawRequestsCount()`, `hasVoted()`.

### Présentation (~15 min)

| Bloc | Durée | Qui |
| --- | --- | --- |
| Problème, objectifs, architecture | 3 min | Étudiant 4 |
| Smart contracts, sécurité, `npm test` en direct | 3 min | Étudiant 1 |
| Démo scénario A (succès + vote + retrait) | 4 min | Étudiants 2 et 3 |
| Démo scénario B (échec + remboursement) | 3 min | Étudiant 4 |
| Conclusion, questions | 2 min | Tous |

- [ ] Rapport complet, relu par les 4, exporté en PDF
- [ ] Slides terminées
- [ ] Démo répétée 2 fois + vidéo de secours enregistrée
- [ ] Tag `v1.0` sur GitHub

---

## Commandes utiles

```bash
npm install                 # une fois
npm test                    # 47 tests
npm run node                # terminal 1 : blockchain locale (laisser ouvert)
npm run deploy              # terminal 2 : déploie la fabrique
npm run sync                # copie ABI + adresse dans frontend/src
npm run simulate            # rejoue les scénarios A et B sans interface
SECONDS=120 npm run ff      # avance l'horloge de 120 s
```

## Règles Git

1. `git checkout main && git pull`
2. `git checkout -b feat/ma-tache`
3. Commit, puis `git push -u origin feat/ma-tache`
4. Pull Request → relue par un autre membre → « Squash and merge »
