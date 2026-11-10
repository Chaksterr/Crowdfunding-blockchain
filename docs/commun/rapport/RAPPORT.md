# Rapport de projet — Plateforme de financement participatif sur blockchain

**Équipe :** 4 étudiants
**Stack :** Solidity 0.8.24 · Hardhat · Hardhat Ignition · ethers.js v6 · React · Redux Toolkit · Tailwind CSS · MetaMask
**Réseau de démonstration :** Hardhat local, chainId `31337`

---

## 1. Introduction et contexte

Le financement participatif classique repose sur un intermédiaire : une plateforme collecte les fonds, prélève une commission et décide des conditions de déblocage. Les contributeurs doivent lui faire confiance pour conserver les fonds, vérifier l'usage promis et rembourser en cas d'échec.

Ce projet remplace cet intermédiaire par un **smart contract** déployé sur Ethereum. Une campagne est un contrat autonome qui :

- conserve les fonds des donateurs ;
- applique des règles fixées à la création (objectif, don minimum, date limite) ;
- n'autorise le créateur à retirer les fonds qu'après un vote favorable des donateurs ;
- rembourse automatiquement chaque donateur si l'objectif n'est pas atteint.

L'objectif pédagogique est double : concevoir un contrat correct et sûr, puis construire une interface web complète qui rend le cycle de vie d'une campagne visible et manipulable avec MetaMask.

Le projet suit trois phases : contrats et sécurité (phase 1), interface web et données de démo (phase 2), recette, rapport et démonstration (phase 3).

---

## 2. Spécifications

### 2.1 Acteurs

| Acteur | Rôle |
| --- | --- |
| Visiteur | consulte les campagnes sans portefeuille |
| Donateur | connecte MetaMask, donne, vote, retire son remboursement |
| Créateur | lance une campagne, demande un retrait, exécute le retrait approuvé |

Un même compte peut être créateur d'une campagne et donateur d'une autre. Le créateur peut aussi donner à sa propre campagne.

### 2.2 Fonctionnalités

| Réf. | Fonctionnalité | Fonction |
| --- | --- | --- |
| F1 | Créer une campagne (titre, description, objectif, don minimum, durée) | `Crowdfunding.createProject()` |
| F2 | Donner avant la date limite, montant ≥ minimum | `Project.contribute()` |
| F3 | Consulter objectif, date limite, total, donateurs, temps restant, état | `getStatus()`, `timeLeft()`, `getDonors()` |
| F4 | Demander un retrait (montant, motif, destinataire) si la campagne réussit | `createWithdrawRequest()` |
| F5 | Voter, puis retirer si au moins 50 % des donateurs approuvent | `voteWithdrawRequest()`, `withdrawRequestedAmount()` |
| F6 | Se faire rembourser si le total est inférieur à l'objectif après la date limite | `refund()` |
| F7 | Interface web avec MetaMask | `frontend/` |

### 2.3 Règles de gestion

| Réf. | Règle | Mise en œuvre |
| --- | --- | --- |
| RG1 | Paramètres positifs, date limite dans le futur | `require` du constructeur et durée > 0 |
| RG2 | Pas de don après la date limite ni sous le minimum | `require` de `contribute()` |
| RG3 | Fonds bloqués jusqu'à la date limite | aucune sortie possible pendant l'état « En cours » |
| RG4 | Retrait si au moins 50 % des donateurs approuvent | `approvals * 2 >= donors.length` |
| RG5 | Chaque donateur récupère sa contribution, une seule fois | contribution remise à 0 avant l'envoi |

### 2.4 Écarts assumés par rapport au cahier des charges

Trois choix ont été faits pour simplifier le contrat sans réduire les garanties :

1. **État calculé, non stocké.** `getStatus()` compare l'horloge et le total collecté. Aucune transaction n'est nécessaire pour clôturer une campagne, et l'état ne peut pas être incohérent.
2. **Durée au lieu d'une date.** L'interface saisit des minutes ; le contrat calcule `deadline = block.timestamp + duration`. Cela supprime les problèmes de fuseau horaire et de date passée.
3. **Fabrique de campagnes.** Un contrat `Crowdfunding` déploie un contrat `Project` par campagne. Chaque campagne isole ses fonds et ses donateurs, et la liste globale reste simple à parcourir.

---

## 3. Architecture

```mermaid
flowchart LR
    U["Utilisateur<br/>Créateur · Donateur · Visiteur"]
    subgraph FRONT["frontend/"]
        UI["React + Tailwind"]
        W3["ethers.js v6 + Redux"]
    end
    MM["MetaMask"]
    subgraph CHAIN["Hardhat · 31337"]
        F["Crowdfunding.sol<br/>fabrique"]
        P["Project.sol<br/>une instance par campagne"]
    end
    U --> UI --> W3
    W3 -- écriture --> MM --> F
    W3 -- lecture --> P
    F -- crée --> P
    P -. événements .-> W3
```

- **Crowdfunding** est déployé une fois. Il crée les campagnes et expose la liste des adresses.
- **Project** est déployé par la fabrique. Il contient les fonds, les contributions et les demandes de retrait d'une seule campagne.
- Le frontend utilise deux fournisseurs : `BrowserProvider` pour signer avec MetaMask, `JsonRpcProvider` pour lire sans portefeuille.
- Les événements (`DonationReceived`, `WithdrawVote`, `FundsWithdrawn`, `Refunded`) permettent de rafraîchir l'interface sans interrogation constante.

Cette séparation evite un contrat monolithique : une campagne ne peut pas modifier les fonds d'une autre, et la fabrique n'a aucun droit sur les fonds.

---

## 4. Smart contracts et sécurité

### 4.1 `Crowdfunding.sol`

| Élément | Rôle |
| --- | --- |
| `createProject(title, description, goal, minContribution, duration)` | déploie un `Project`, l'ajoute à la liste, émet `ProjectCreated` |
| `getProjects()` / `getProjectsCount()` | lecture de la liste |
| `projects(uint256)` | lecture d'une adresse par index |

Le créateur enregistré est `msg.sender`. La fabrique ne conserve aucun ETH et n'a pas de fonction de retrait : elle ne peut pas toucher aux fonds des campagnes.

### 4.2 `Project.sol`

**Données immuables :** créateur, objectif, don minimum, date limite. Le titre et la description sont en lecture seule après création.

**Données mutables :** total collecté, contributions par adresse, liste des donateurs, demandes de retrait, votes.

**Cycle de vie :**

```mermaid
stateDiagram-v2
    [*] --> EnCours: createProject()
    EnCours --> EnCours: contribute()
    EnCours --> Reussie: date limite passée, total >= objectif
    EnCours --> Echouee: date limite passée, total < objectif
    Reussie --> Reussie: demande, votes, retrait si >= 50 %
    Echouee --> Echouee: refund() par chaque donateur
```

L'état est calculé :

```solidity
if (block.timestamp < deadline) return State.Ongoing;
return totalRaised >= goal ? State.Successful : State.Failed;
```

**Vote et retrait.** Une voix par donateur, quel que soit le montant. Le quorum porte sur le nombre de donateurs, pas sur les montants : une abstention ne réduit donc pas le seuil. Une demande est exécutable si `approvals * 2 >= donors.length`. Le créateur peut cumuler plusieurs demandes, mais chaque exécution vérifie le solde réel.

### 4.3 Sécurité

| Risque | Protection |
| --- | --- |
| Réentrance sur `refund()` | contribution remise à 0 **avant** l'appel externe |
| Réentrance sur le retrait | `executed = true` **avant** l'appel externe |
| Double vote | mapping `hasVoted[id][adresse]` |
| Double remboursement | contribution remise à 0 |
| Retrait par un non-créateur | modificateur `onlyCreator` |
| Demande sur une campagne non réussie | `require(getStatus() == Successful)` |
| Destinataire nul | `require(recipient != address(0))` |
| Virement refusé | `require(ok)` : la transaction entière est annulée |
| Envoi direct d'ETH | pas de `receive()` ni de `fallback()` |

Le contrat n'utilise pas `nonReentrant` : l'ordre des opérations (checks-effects-interactions) suffit, et les tests d'attaque le vérifient. L'atomicité d'Ethereum garantit qu'un `revert` annule aussi la mise à jour d'état.

### 4.4 Limites connues

- Le quorum porte sur le nombre de donateurs : un créateur qui est seul donateur peut approuver sa propre demande à 100 %.
- Les demandes de retrait ne peuvent pas être annulées.
- Les tableaux de donateurs et de demandes ne sont pas bornés : un nombre très élevé de donateurs augmenterait le coût du vote et du retrait.
- Une campagne réussie dont le créateur ne fait jamais de demande laisse les fonds bloqués dans le contrat.
- Les attaques Sybil (plusieurs comptes pour un même utilisateur) ne sont pas empêchées.
- Le contrat n'est pas audité et n'a pas de mécanisme de mise à jour.

---

## 5. Tests et déploiement

### 5.1 Tests

La suite utilise Mocha, Chai et Hardhat. Les tests sont isolés par `loadFixture`, ce qui redéploie un état propre pour chaque scénario.

| Groupe | Nombre | Exemples |
| --- | --- | --- |
| Déploiement | 5 | paramètres enregistrés, refus d'un créateur/objectif/minimum/durée invalide |
| Dons | 5 | don accepté, pas de doublon, refus sous le minimum, refus après la date, refus d'un envoi direct |
| États et temps | 4 | réussie, échouée, reste en cours si l'objectif est atteint avant la fin, `timeLeft` |
| Demande de retrait | 6 | accès créateur, campagne réussie, montant, destinataire, événement |
| Vote et retrait | 12 | non-donateur, double vote, quorum 1/3 et 2/3, second retrait, cumul |
| Remboursement | 7 | montant exact, événement, double remboursement, non-donateur, campagne réussie |
| Sécurité | 3 | réentrance sur `refund`, virement refusé, retrait annulé |
| **Total** | **47** | **42 `Project` + 5 `Crowdfunding`** |

Résultat mesuré le 2026-11-10 :

```text
47 passing (869ms)
```

### 5.2 Couverture

```text
contracts/Crowdfunding.sol   100 % statements · 100 % branches · 100 % functions · 100 % lines
contracts/Project.sol        100 % statements · 100 % branches · 100 % functions · 100 % lines
```

Les contrats d'attaque (`contracts/test/`) sont exclus de la mesure par `.solcover.js`. La couverture ne prouve pas l'absence de bugs, mais elle indique que chaque branche du code est exercée au moins une fois.

### 5.3 Déploiement

Hardhat Ignition déploie la fabrique de façon déterministe :

```bash
npm run deploy
# CrowdfundingModule#Crowdfunding - 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Scripts associés :

| Commande | Rôle |
| --- | --- |
| `npm run node` | lance la blockchain locale |
| `npm run deploy` | déploie la fabrique |
| `npm run deploy:reset` | redéploie après un redémarrage du nœud |
| `npm run sync` | copie les ABI et l'adresse vers `frontend/src/` |
| `npm run simulate` | rejoue les scénarios A et B sans interface |
| `npm run seed` | crée trois campagnes de démonstration |
| `SECONDS=120 npm run ff` | avance l'horloge locale |

La CI GitHub Actions exécute l'installation, la compilation, les 47 tests, la couverture, un déploiement Ignition à blanc et le build du frontend. Le hook `pre-commit` exécute les mêmes vérifications avant chaque commit.

### 5.4 Données de démonstration

`npm run seed` crée trois campagnes :

| Campagne | Objectif | Dons | État final |
| --- | --- | --- | --- |
| Atelier vélo solidaire | 5 ETH | 0,5 ETH | En cours |
| Album photo des étudiants | 5 ETH | 2 + 2 + 1 ETH | Réussie |
| Serre connectée du campus | 50 ETH | 1 + 2 ETH | Échouée |

Le script avance l'horloge de 700 secondes pour clôturer les deux campagnes courtes, puis vérifie les états `0`, `2` et `1` avant d'afficher un tableau récapitulatif.

---

## 6. Interface web

L'interface est une application **React 18** construite avec **Vite 5**, stylée avec **Tailwind CSS 3**, routée avec **React Router 6** et alimentée par **ethers.js v6**. L'état du portefeuille est géré par **Redux Toolkit**.

### 6.1 Structure

```text
frontend/src/
  abi/                 ABI copiées par npm run sync
  components/          Layout, Header, WalletButton, ProjectCard, ProgressBar,
                       ToastProvider, CopyAddress, ErrorBoundary
  components/ui/       Button, Card, Badge, Field, Alert, EmptyState, PageHeader, Spinner
  hooks/               useWallet, useAsyncData, useTransaction, useChainEvents
  pages/               HomePage, CreatePage, ProjectPage, MyContributionsPage, NotFoundPage
  store/               walletSlice (compte, chaîne, solde, statut)
  web3/                provider, contracts, projects, format, errors
```

### 6.2 Couche Web3

Deux fournisseurs coexistent :

- `JsonRpcProvider` sur `VITE_RPC_URL` (par défaut `http://127.0.0.1:8545`) pour toutes les lectures. Il permet de consulter les campagnes **sans MetaMask**.
- `BrowserProvider(window.ethereum)` pour les écritures. `getSigner()` n'est appelé qu'au moment d'une transaction.

La couche `web3/projects.js` expose des fonctions pures et testables :

| Fonction | Rôle |
| --- | --- |
| `loadProjects()` | liste les adresses de la fabrique puis lit chaque campagne en parallèle (`Promise.allSettled`) |
| `loadProject(address, account)` | détail, solde, donateurs triés, demandes, contribution et votes du compte |
| `createProject(...)` | conversion ETH → wei, durée minutes → secondes, parse de `ProjectCreated` |
| `donate(...)` | `contribute({ value })` avec validation du montant |
| `createWithdrawRequest`, `voteWithdrawRequest`, `withdrawRequestedAmount`, `refund` | actions du cycle de vie |

Les montants restent des `bigint` jusqu'à l'affichage : aucun `Number()` n'est appliqué aux wei. Le formatage (`formatEth`, `parseEth`, `formatPercent`) utilise `Intl` en français et accepte la virgule décimale.

### 6.3 Gestion du portefeuille

Le slice Redux contient `{ status, account, chainId, balance, error }`. Au montage, `eth_accounts` est appelé silencieusement : si MetaMask est déjà autorisé, l'adresse est restaurée ; sinon l'application reste en lecture seule. Les événements `accountsChanged` et `chainChanged` mettent à jour l'état, et un bandeau propose de basculer sur la chaîne `31337` en cas de mauvais réseau. Sans MetaMask, le bouton devient « Installer MetaMask » et un message explique la lecture seule.

### 6.4 Pages et parcours

- **Accueil** : statistiques globales, grille de cartes (titre, statut, progression, collecté/objectif, donateurs, date limite, temps restant), états chargement/erreur/vide, actualisation manuelle, abonnement à `ProjectCreated` et polling de secours.
- **Créer** : formulaire validé côté client (titre 3–80, description 10–500, objectif > 0, minimum > 0 et ≤ objectif, durée 1–10 080 minutes), récapitulatif, blocage si le portefeuille n'est pas connecté ou si le réseau est incorrect, redirection vers le détail après confirmation.
- **Détail** : en-tête avec badge d'état, adresses copiables, date limite et temps restant ; métriques (objectif, collecté, solde du contrat, minimum, donateurs, demandes) ; description ; formulaire de don avec montants rapides ; liste des donateurs ; demandes de retrait avec barre d'approbation ; boutons Voter/Retirer selon le rôle et le quorum ; carte de remboursement si la campagne a échoué ; abonnement aux cinq événements du contrat et polling de 15 s.
- **Mes contributions** : liste les campagnes où `contributions(compte) > 0`, avec le montant personnel et le statut. Une contribution remboursée disparaît de la liste, conformément au contrat.

### 6.5 Gestion des erreurs et accessibilité

Les 20 messages `require` du contrat sont traduits en français dans `web3/errors.js`, ainsi que le refus MetaMask (code 4001), les fonds insuffisants et l'absence de RPC. Les transactions affichent un état `pending`, désactivent le bouton et rafraîchissent les données après confirmation. Les toasts sont accessibles (`aria-live`, fermeture au clavier), les formulaires associent label, hint et erreur (`aria-invalid`, `aria-describedby`), les barres de progression exposent `role="progressbar"` et les pages restent utilisables à 360 px.

### 6.6 Tests

Le frontend utilise **Vitest**, **Testing Library** et **jsdom** :

```text
6 fichiers, 55 tests
errors 8 · format 23 · projects 13 · ProjectCard 3 · HomePage 3 · ProjectPage 5
```

Les tests couvrent le formatage, le mapping d'erreurs, la couche de données (avec contrats mockés) et la visibilité des actions selon le statut, le rôle et la contribution. Le build de production passe (228 modules) et la CI exécute `npm test` puis `npm run build` lorsque `frontend/package.json` existe.

---

## 7. Recette et validation

La fiche détaillée est dans `docs/commun/RECETTE.md`. Les scénarios A à F sont rejouables avec les comptes Hardhat #0 à #3.

| Scénario | Vérification | Résultat |
| --- | --- | --- |
| A — succès, vote, retrait | 3 dons de 2 ETH, demande de 4 ETH, 2 votes sur 3, retrait | Validé par `npm run simulate` et les tests de contrat ; parcours UI couvert par les tests de `ProjectPage` |
| B — échec, remboursement | objectif 50 ETH, dons 1 + 2 ETH, deux remboursements | Validé par `npm run simulate` ; contrat vidé, double remboursement refusé |
| C — don invalide | sous le minimum, après la date limite | Refusé par `contribute()` avec messages traduits |
| D — quorum insuffisant | 1 vote sur 3 | Refusé par `withdrawRequestedAmount()` |
| E — doubles actions | double vote, double remboursement, non-créateur | Refusés par les `require` et les mappings |
| F — sans MetaMask | lecture des campagnes, écriture masquée | Lecture via `JsonRpcProvider`, boutons d'écriture conditionnés par `isConnected` |

La vérification automatisée repose sur 47 tests de contrat (100 % de couverture) et 55 tests frontend. La recette manuelle dans un navigateur avec MetaMask reste à exécuter sur les quatre postes de l'équipe ; elle est décrite pas à pas dans `RECETTE.md` et ne peut pas être automatisée sans navigateur dans l'environnement de développement utilisé.

### 7.1 Limites de la validation

- Les tests frontend mockent la couche contrats : ils vérifient le comportement de l'interface, pas la signature réelle d'une transaction MetaMask.
- Le multi-PC (`--hostname 0.0.0.0` + `--host`) est documenté mais n'a pas été mesuré dans cet environnement.
- Les captures d'écran et la vidéo de secours restent à produire par l'équipe.

---

## 8. Conclusion

Le projet montre qu'un smart contract peut remplacer un intermédiaire de confiance pour une collecte conditionnelle : les règles sont vérifiables, les fonds sont isolés et les remboursements sont automatiques. La principale difficulté n'est pas le code, mais la conception des incitations et des cas limites : quorum, abstention, fonds bloqués, cumul des demandes.

Perspectives : déploiement sur Sepolia, vote pondéré par le montant, stockage des descriptions sur IPFS, annulation des demandes, plafond du nombre de donateurs, audit externe.
