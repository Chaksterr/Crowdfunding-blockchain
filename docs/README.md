# Documentation technique complète — Plateforme de financement participatif

## Table des matières

1. [Contexte et problème résolu](#1-contexte-et-problème-résolu)
2. [Architecture globale](#2-architecture-globale)
3. [Acteurs du système](#3-acteurs-du-système)
4. [Cycle de vie d'une campagne](#4-cycle-de-vie-dune-campagne)
5. [Règles de gestion (RG1 à RG5)](#5-règles-de-gestion-rg1-à-rg5)
6. [Contrat Crowdfunding.sol — La fabrique](#6-contrat-crowdfundingsol--la-fabrique)
7. [Contrat Project.sol — La campagne](#7-contrat-projectsol--la-campagne)
8. [Tests unitaires — Project.js](#8-tests-unitaires--projectjs)
9. [Tests unitaires — Crowdfunding.js](#9-tests-unitaires--crowdfundingjs)
10. [Scripts utilitaires](#10-scripts-utilitaires)
11. [Configuration et déploiement](#11-configuration-et-déploiement)
12. [Sécurité](#12-sécurité)
13. [Référence des messages d'erreur](#13-référence-des-messages-derreur)
14. [Référence des événements](#14-référence-des-événements)
15. [Structure complète du projet](#15-structure-complète-du-projet)

---

## 1. Contexte et problème résolu

### Le problème

Dans un financement participatif classique (GoFundMe, Kickstarter, etc.), un **intermédiaire centralisé** garde l'argent. Cet intermédiaire peut :
- Bloquer les fonds sans raison
- Prélever des commissions
- Modifier les règles unilatéralement
- Disparaître avec l'argent

Les donateurs et les créateurs de projets doivent lui faire **confiance aveugle**.

### La solution

Un **Smart Contract** (programme autonome sur la blockchain) remplace cet intermédiaire. Il fonctionne comme un coffre-fort programmable :

- Les règles sont écrites dans le code et **visibles par tout le monde**
- Une fois déployé, **personne ne peut modifier** les paramètres (objectif, deadline, minimum)
- L'argent (ETH) est **bloqué dans le contrat** : ni le créateur, ni le développeur, ni personne ne peut le prendre sans respecter les règles
- Si la campagne réussit : le créateur peut demander un retrait, mais les donateurs doivent **voter** (majorité de 50 %)
- Si la campagne échoue : chaque donateur récupère **exactement** ce qu'il a donné

### Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Langage des contrats | **Solidity 0.8.24** | Écrire la logique du coffre-fort |
| Environnement de développement | **Hardhat 2** | Compiler, tester, déployer |
| Librairie de test | **Mocha + Chai** (via Hardhat Toolbox) | Exécuter les 31 tests automatisés |
| Interaction avec les contrats | **Ethers.js v6** (via Hardhat Toolbox) | Appeler les fonctions Solidity depuis JavaScript |
| Déploiement | **Hardhat Ignition** | Déployer le contrat sur le réseau |
| Blockchain locale | **Hardhat Network** | Simuler une blockchain Ethereum locale |
| Réseau | `http://127.0.0.1:8545`, chain ID `31337` | Adresse du nœud local |
| Wallet (plus tard) | **MetaMask** | Signer les transactions depuis le navigateur |

---

## 2. Architecture globale

Le projet utilise le **patron de conception Factory** (fabrique). Il y a exactement **2 contrats** :

### Le patron Factory expliqué

Imaginez une usine qui fabrique des coffres-forts. L'usine elle-même ne contient pas d'argent — elle ne fait que créer des coffres. Chaque coffre est indépendant : il a son propre argent, ses propres règles, ses propres donateurs.

```
┌──────────────────────────────────────────────────────────┐
│                  Blockchain Ethereum                      │
│                                                          │
│   ┌──────────────────────┐                               │
│   │   Crowdfunding.sol   │  ← Le contrat FABRIQUE        │
│   │   (déployé une fois) │     Il crée les projets       │
│   │                      │     et garde leur liste       │
│   │   projects[] ────────┼──┐                            │
│   └──────────────────────┘  │                            │
│                             │                            │
│         ┌───────────────────┤                            │
│         │                   │                            │
│         ▼                   ▼                            │
│   ┌───────────┐     ┌───────────┐     ┌───────────┐     │
│   │ Project 1 │     │ Project 2 │     │ Project N │     │
│   │           │     │           │     │           │     │
│   │ goal: 5Ξ  │     │ goal: 10Ξ │     │ goal: 2Ξ  │     │
│   │ raised: 6Ξ│     │ raised: 3Ξ│     │ raised: 0 │     │
│   │ donors: 3 │     │ donors: 2 │     │ donors: 0 │     │
│   │ status: ✓ │     │ status: ✗ │     │ status: ⏳│     │
│   └───────────┘     └───────────┘     └───────────┘     │
│                                                          │
│   Chaque Project est un contrat INDÉPENDANT.             │
│   Il détient ses propres ETH, donateurs, votes.          │
└──────────────────────────────────────────────────────────┘
```

**Pourquoi ce patron ?**
- Chaque campagne est isolée : si une campagne a un problème, les autres ne sont pas affectées
- Le créateur du projet est l'appelant (`msg.sender`), pas la fabrique
- L'interface web n'a besoin que de l'adresse de la fabrique pour retrouver tous les projets

### Flux de communication

```
Utilisateur (wallet MetaMask)
    │
    ├── createProject() ──────────► Crowdfunding.sol ──► déploie un nouveau Project.sol
    │
    ├── contribute() ─────────────► Project.sol (celui choisi)
    ├── voteWithdrawRequest() ────► Project.sol
    ├── refund() ─────────────────► Project.sol
    │
    └── getProjects() ────────────► Crowdfunding.sol ──► retourne la liste des adresses
```

---

## 3. Acteurs du système

### Créateur (creator)

C'est l'adresse Ethereum qui a appelé `createProject()`. Son adresse est stockée de manière **immutable** (impossible à changer après le déploiement).

**Ce qu'il peut faire :**
- Créer une campagne (via la fabrique)
- Créer des demandes de retrait (seulement si la campagne a réussi)
- Exécuter un retrait approuvé par les donateurs
- Donner à son propre projet (il devient alors aussi donateur)

**Ce qu'il ne peut PAS faire :**
- Retirer de l'argent sans l'approbation de 50 % des donateurs
- Retirer avant la fin de la deadline
- Modifier l'objectif, la deadline ou le montant minimum après la création

### Donateur (donor)

C'est toute adresse qui a envoyé au moins un don au projet. Une adresse devient donateur dès son premier appel à `contribute()`.

**Ce qu'il peut faire :**
- Donner de l'ETH (avant la deadline, montant ≥ minimum)
- Donner plusieurs fois (les montants s'accumulent)
- Voter sur les demandes de retrait (un vote par demande)
- Se faire rembourser (seulement si la campagne a échoué)

**Ce qu'il ne peut PAS faire :**
- Voter deux fois sur la même demande
- Se faire rembourser deux fois
- Récupérer plus que ce qu'il a donné
- Se faire rembourser si la campagne a réussi

### Visiteur

N'importe qui peut lire l'état du contrat (fonctions `view`) sans signer de transaction :
- `getStatus()` — état de la campagne
- `timeLeft()` — temps restant
- `getDonors()` — liste des donateurs
- `totalRaised` — montant total collecté
- `goal` — objectif
- `contributions(adresse)` — combien une adresse a donné

### Matrice des permissions

| Fonction | Créateur | Donateur | Autre adresse |
|----------|----------|----------|---------------|
| `contribute()` | ✅ (devient aussi donateur) | ✅ | ✅ (devient donateur) |
| `createWithdrawRequest()` | ✅ | ❌ | ❌ |
| `voteWithdrawRequest()` | ✅ (s'il est aussi donateur) | ✅ | ❌ |
| `withdrawRequestedAmount()` | ✅ | ❌ | ❌ |
| `refund()` | ✅ (s'il est aussi donateur) | ✅ | ❌ (rien à rembourser) |
| Fonctions de lecture | ✅ | ✅ | ✅ |

---

## 4. Cycle de vie d'une campagne

Une campagne passe par **3 états possibles**. L'état n'est **pas stocké** comme variable — il est **calculé à la volée** par `getStatus()` à partir de l'heure actuelle et du montant collecté. Cela garantit qu'il est toujours exact.

```
                        createProject()
                              │
                              ▼
                     ┌────────────────┐
                     │    ONGOING     │  ← Campagne en cours
                     │  (En cours)    │
                     │                │
                     │  contribute()  │  ← Les donateurs peuvent donner
                     │  est autorisé  │
                     └───────┬────────┘
                             │
                     La deadline passe
                     (block.timestamp >= deadline)
                             │
              ┌──────────────┴──────────────┐
              │                             │
    totalRaised >= goal            totalRaised < goal
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   SUCCESSFUL    │           │     FAILED      │
    │   (Réussie)     │           │   (Échouée)     │
    │                 │           │                 │
    │ Le créateur     │           │ Les donateurs   │
    │ peut demander   │           │ peuvent appeler │
    │ des retraits    │           │ refund() pour   │
    │                 │           │ récupérer leur  │
    │ Les donateurs   │           │ contribution    │
    │ votent          │           │                 │
    └─────────────────┘           └─────────────────┘
```

### Détail de la logique `getStatus()`

```solidity
function getStatus() public view returns (State) {
    if (block.timestamp < deadline) return State.Ongoing;   // pas encore fini
    return totalRaised >= goal ? State.Successful : State.Failed;
}
```

**Point important :** même si le montant dépasse l'objectif *avant* la deadline, le statut reste `Ongoing`. La campagne ne passe à `Successful` qu'**après** la deadline. Cela permet à d'autres donateurs de continuer à donner jusqu'au dernier moment.

---

## 5. Règles de gestion (RG1 à RG5)

### RG1 — Paramètres de création valides

**Règle :** L'objectif et le don minimum doivent être strictement positifs. La durée doit être > 0 (ce qui place automatiquement la deadline dans le futur).

**Dans le code (constructeur de Project.sol) :**

```solidity
require(_creator != address(0), "Createur invalide");      // adresse non nulle
require(_goal > 0, "Objectif invalide");                    // objectif > 0
require(_minContribution > 0, "Don minimum invalide");      // minimum > 0
require(_duration > 0, "Duree invalide");                   // durée > 0
```

**Pourquoi ?** Un objectif de 0 serait atteint immédiatement sans aucun don. Un minimum de 0 permettrait des dons de 0 ETH. Une durée de 0 créerait une campagne déjà terminée.

### RG2 — Conditions de don

**Règle :** Aucun don n'est accepté après la deadline ou en dessous du montant minimum.

**Dans le code (fonction `contribute()`) :**

```solidity
require(block.timestamp < deadline, "Campagne terminee");   // avant la deadline
require(msg.value >= minContribution, "Don trop faible");    // au-dessus du minimum
```

**Pourquoi ?** Accepter un don après la deadline fausserait le statut de la campagne. Le minimum empêche le spam de micro-transactions.

### RG3 — Fonds bloqués

**Règle :** Les fonds restent bloqués dans le contrat jusqu'à la date limite. Personne ne peut les sortir pendant la campagne.

**Comment c'est garanti ?**
- `createWithdrawRequest()` exige `getStatus() == State.Successful` (impossible avant la deadline)
- `refund()` exige `getStatus() == State.Failed` (impossible avant la deadline)
- Il n'y a pas de fonction `receive()` ni `fallback()` : l'envoi direct d'ETH est rejeté
- Il n'y a aucune autre fonction qui envoie de l'ETH

### RG4 — Approbation de 50 % pour les retraits

**Règle :** En cas de succès, un retrait nécessite l'approbation d'au moins 50 % des donateurs.

**Dans le code (fonction `withdrawRequestedAmount()`) :**

```solidity
require(r.approvals * 2 >= donors.length, "Moins de 50% d'approbation");
```

**Comment ça marche concrètement ?**

| Nombre de donateurs | Votes nécessaires | Calcul |
|---------------------|-------------------|--------|
| 1 | 1 | 1×2=2 ≥ 1 ✓ |
| 2 | 1 | 1×2=2 ≥ 2 ✓ |
| 3 | 2 | 2×2=4 ≥ 3 ✓ (mais 1×2=2 < 3 ✗) |
| 4 | 2 | 2×2=4 ≥ 4 ✓ |
| 5 | 3 | 3×2=6 ≥ 5 ✓ (mais 2×2=4 < 5 ✗) |
| 10 | 5 | 5×2=10 ≥ 10 ✓ |
| 100 | 50 | 50×2=100 ≥ 100 ✓ |

**Pourquoi `r.approvals * 2 >= donors.length` au lieu de `r.approvals >= donors.length / 2` ?**
Parce que la division entière en Solidity arrondit vers le bas. Avec 3 donateurs : `3/2 = 1` (en Solidity), donc 1 vote suffirait — ce n'est pas 50 %. La multiplication évite ce piège.

**Protections supplémentaires du vote :**
- Un donateur ne peut voter qu'une fois par demande (`hasVoted[id][msg.sender]`)
- Seules les adresses qui ont donné peuvent voter (`contributions[msg.sender] > 0`)
- On ne peut pas voter sur une demande déjà exécutée

### RG5 — Remboursement en cas d'échec

**Règle :** Chaque donateur ne récupère que sa propre contribution, en une seule fois.

**Dans le code (fonction `refund()`) :**

```solidity
require(getStatus() == State.Failed, "Remboursement impossible");  // campagne échouée
uint256 amount = contributions[msg.sender];
require(amount > 0, "Rien a rembourser");                          // a effectivement donné
contributions[msg.sender] = 0;          // remet à zéro AVANT d'envoyer l'ETH
(bool ok, ) = payable(msg.sender).call{value: amount}("");
require(ok, "Echec du remboursement");
```

**Pourquoi remettre à 0 avant d'envoyer ?** C'est la protection contre les **attaques par réentrance** (voir section Sécurité).

---

## 6. Contrat Crowdfunding.sol — La fabrique

**Fichier :** `contracts/Crowdfunding.sol` — **41 lignes**

Ce contrat est le point d'entrée. Il ne contient **pas d'ETH** et ne gère **aucune logique de campagne**. Il fait deux choses :

### Données stockées

```solidity
Project[] public projects;    // tableau de toutes les campagnes créées
```

C'est un tableau dynamique. Chaque élément est l'adresse d'un contrat `Project` déployé.

### Fonction `createProject()`

```solidity
function createProject(
    string calldata title,
    string calldata description,
    uint256 goal,              // en wei (1 ETH = 10^18 wei)
    uint256 minContribution,   // en wei
    uint256 duration           // en secondes
) external returns (address)
```

**Que fait-elle ?**
1. Déploie un nouveau contrat `Project` avec `new Project(...)`. Le `msg.sender` (l'appelant) est passé comme créateur — pas l'adresse de la fabrique
2. Ajoute l'adresse du nouveau projet dans le tableau `projects[]`
3. Émet l'événement `ProjectCreated` avec l'adresse du projet, le créateur, le titre, l'objectif et la deadline
4. Retourne l'adresse du nouveau contrat

**Point clé :** C'est la fabrique qui exécute `new Project(msg.sender, ...)`. Si elle passait `address(this)` au lieu de `msg.sender`, le créateur serait la fabrique elle-même et personne ne pourrait demander de retrait. C'est testé dans `test/Crowdfunding.js`.

### Fonctions de lecture

```solidity
function getProjects() external view returns (Project[] memory)   // liste complète
function getProjectsCount() external view returns (uint256)       // nombre de projets
```

### Événement

```solidity
event ProjectCreated(
    address indexed project,    // adresse du contrat Project créé
    address indexed creator,    // adresse du créateur
    string title,               // titre de la campagne
    uint256 goal,               // objectif en wei
    uint256 deadline            // timestamp Unix de fin
);
```

---

## 7. Contrat Project.sol — La campagne

**Fichier :** `contracts/Project.sol` — **141 lignes**

C'est le cœur du système. Chaque instance est un coffre-fort autonome.

### Types de données

#### Enum `State`
```solidity
enum State { Ongoing, Failed, Successful }   // 0, 1, 2
```
N'est **pas stocké** en tant que variable. Calculé à chaque appel par `getStatus()`.

#### Struct `WithdrawRequest`
```solidity
struct WithdrawRequest {
    uint256 amount;            // montant à retirer en wei
    string reason;             // justification ("Matériel", "Prestataire", etc.)
    address payable recipient; // adresse qui recevra l'ETH
    uint256 approvals;         // nombre de votes favorables
    bool executed;             // true si le retrait a déjà été effectué
}
```

### Variables d'état

#### Immutables (fixées une fois, jamais modifiées)

| Variable | Type | Description |
|----------|------|-------------|
| `creator` | `address` | Adresse du créateur de la campagne |
| `goal` | `uint256` | Montant à atteindre (en wei) |
| `minContribution` | `uint256` | Don minimum accepté (en wei) |
| `deadline` | `uint256` | Timestamp Unix de fin = `block.timestamp + duration` |

Le mot-clé `immutable` signifie que ces valeurs sont écrites dans le bytecode du contrat. Elles ne peuvent être modifiées par **aucune** fonction, **aucun** acteur, **jamais**.

#### Mutables (changent pendant la vie du contrat)

| Variable | Type | Description |
|----------|------|-------------|
| `title` | `string` | Titre de la campagne |
| `description` | `string` | Description de la campagne |
| `totalRaised` | `uint256` | Somme de tous les dons reçus |
| `contributions` | `mapping(address => uint256)` | Combien chaque adresse a donné |
| `donors` | `address[]` (private) | Liste des adresses uniques des donateurs |
| `withdrawRequests` | `WithdrawRequest[]` | Liste des demandes de retrait |
| `hasVoted` | `mapping(uint256 => mapping(address => bool))` | Pour chaque demande (id), qui a voté |

### Constructeur

```solidity
constructor(
    address _creator,
    string memory _title,
    string memory _description,
    uint256 _goal,
    uint256 _minContribution,
    uint256 _duration
)
```

Appelé une seule fois par la fabrique lors du `new Project(...)`. Vérifie les 4 conditions de RG1 puis fixe les valeurs immutables. La `deadline` est calculée comme `block.timestamp + _duration`.

### Modificateur `onlyCreator`

```solidity
modifier onlyCreator() {
    require(msg.sender == creator, "Createur uniquement");
    _;
}
```

Utilisé par `createWithdrawRequest()` et `withdrawRequestedAmount()`. Si l'appelant n'est pas le créateur, la transaction est annulée.

### Fonction `contribute()` — Donner (F2)

```solidity
function contribute() external payable
```

**Étape par étape :**
1. Vérifie que la deadline n'est pas passée → sinon revert `"Campagne terminee"`
2. Vérifie que le montant envoyé (`msg.value`) ≥ `minContribution` → sinon revert `"Don trop faible"`
3. Si c'est le premier don de cette adresse (`contributions[msg.sender] == 0`), l'ajoute dans le tableau `donors[]`
4. Ajoute le montant à `contributions[msg.sender]`
5. Ajoute le montant à `totalRaised`
6. Émet `DonationReceived(msg.sender, msg.value)`

**Note :** La fonction est `payable`, ce qui signifie qu'elle peut recevoir de l'ETH. Le montant envoyé est dans `msg.value`. Il n'y a pas de fonction `receive()` dans le contrat : l'envoi direct d'ETH (sans appeler `contribute()`) est rejeté.

### Fonction `createWithdrawRequest()` — Demander un retrait (F4)

```solidity
function createWithdrawRequest(
    uint256 amount,
    string calldata reason,
    address payable recipient
) external onlyCreator
```

**Étape par étape :**
1. Vérifie que le statut est `Successful` → sinon revert `"Campagne non reussie"`
2. Vérifie que le destinataire n'est pas l'adresse nulle → sinon revert `"Destinataire invalide"`
3. Vérifie que le montant est > 0 et ≤ au solde du contrat → sinon revert `"Montant invalide"`
4. Crée un nouveau `WithdrawRequest` avec 0 approbations et `executed = false`
5. Émet `WithdrawRequestCreated(id, amount, recipient, reason)`

**Note :** Le créateur peut faire plusieurs demandes de retrait. Chaque demande est indépendante et votée séparément.

### Fonction `voteWithdrawRequest()` — Voter (F5)

```solidity
function voteWithdrawRequest(uint256 id) external
```

**Étape par étape :**
1. Vérifie que la demande existe → sinon revert `"Demande inexistante"`
2. Vérifie que l'appelant est donateur (`contributions > 0`) → sinon revert `"Pas donateur"`
3. Vérifie que la demande n'est pas déjà exécutée → sinon revert `"Deja execute"`
4. Vérifie que l'appelant n'a pas déjà voté sur cette demande → sinon revert `"Deja vote"`
5. Marque le vote : `hasVoted[id][msg.sender] = true`
6. Incrémente le compteur : `withdrawRequests[id].approvals++`
7. Émet `WithdrawVote(id, msg.sender)`

**Note :** Le vote est binaire (oui/non). Un donateur ne peut voter qu'une fois par demande. Il n'y a pas de mécanisme pour annuler un vote.

### Fonction `withdrawRequestedAmount()` — Retirer (F5)

```solidity
function withdrawRequestedAmount(uint256 id) external onlyCreator
```

**Étape par étape :**
1. Vérifie que la demande existe → sinon revert `"Demande inexistante"`
2. Vérifie que la demande n'est pas déjà exécutée → sinon revert `"Deja execute"`
3. Vérifie que les approbations ≥ 50 % des donateurs → sinon revert `"Moins de 50% d'approbation"`
4. Vérifie que le solde du contrat est suffisant → sinon revert `"Solde insuffisant"`
5. Marque la demande comme exécutée : `r.executed = true` (AVANT l'envoi d'ETH)
6. Envoie l'ETH au destinataire : `r.recipient.call{value: r.amount}("")`
7. Vérifie que l'envoi a réussi → sinon revert `"Echec du virement"`
8. Émet `FundsWithdrawn(id, r.amount, r.recipient)`

**Point critique de sécurité :** `r.executed = true` est mis **avant** l'appel `call`. C'est le pattern "Checks-Effects-Interactions" qui protège contre les attaques par réentrance.

### Fonction `refund()` — Se faire rembourser (F6)

```solidity
function refund() external
```

**Étape par étape :**
1. Vérifie que le statut est `Failed` → sinon revert `"Remboursement impossible"`
2. Lit le montant de la contribution de l'appelant
3. Vérifie que le montant est > 0 → sinon revert `"Rien a rembourser"`
4. Remet la contribution à zéro : `contributions[msg.sender] = 0` (AVANT l'envoi)
5. Envoie l'ETH à l'appelant
6. Vérifie que l'envoi a réussi → sinon revert `"Echec du remboursement"`
7. Émet `Refunded(msg.sender, amount)`

### Fonctions de lecture (F3)

| Fonction | Retour | Description |
|----------|--------|-------------|
| `getStatus()` | `State` (0, 1 ou 2) | État actuel calculé à partir du temps et du montant |
| `timeLeft()` | `uint256` | Secondes restantes avant la deadline (0 si passée) |
| `getDonors()` | `address[]` | Tableau de toutes les adresses uniques des donateurs |
| `getWithdrawRequestsCount()` | `uint256` | Nombre de demandes de retrait créées |

Les variables publiques génèrent aussi des getters automatiques : `creator()`, `goal()`, `minContribution()`, `deadline()`, `title()`, `description()`, `totalRaised()`, `contributions(address)`, `withdrawRequests(uint256)`, `hasVoted(uint256, address)`.

---

## 8. Tests unitaires — Project.js

**Fichier :** `test/Project.js` — **27 tests répartis en 6 blocs**

Les tests utilisent le système de **fixtures** de Hardhat : chaque test démarre d'un état propre et indépendant. Aucun test ne dépend d'un autre.

### Les 4 fixtures (états de départ)

| Fixture | État | Configuration |
|---------|------|---------------|
| `ongoingFixture` | Campagne en cours | Goal = 10 ETH, min = 0.1 ETH, durée = 3600s, aucun don |
| `successfulFixture` | Campagne réussie | 3 donateurs (6 + 3 + 2 = 11 ETH ≥ 10 ETH), deadline passée |
| `failedFixture` | Campagne échouée | 2 donateurs (1 + 2 = 3 ETH < 10 ETH), deadline passée |
| `withRequestFixture` | Réussie + demande en attente | Basé sur `successfulFixture` + 1 demande de retrait de 5 ETH |

### Bloc 1 — Déploiement (RG1) : 5 tests

| Test | Ce qu'il vérifie |
|------|------------------|
| `enregistre les paramètres` | Le créateur, l'objectif, le minimum et le statut initial sont corrects |
| `refuse un objectif nul` | `goal = 0` → revert `"Objectif invalide"` |
| `refuse un don minimum nul` | `minContribution = 0` → revert `"Don minimum invalide"` |
| `refuse une durée nulle` | `duration = 0` → revert `"Duree invalide"` |
| `refuse un créateur à l'adresse nulle` | `creator = 0x0` → revert `"Createur invalide"` |

### Bloc 2 — Dons (F2, RG2) : 5 tests

| Test | Ce qu'il vérifie |
|------|------------------|
| `accepte un don et émet l'événement` | Don de 1 ETH → `totalRaised = 1 ETH` + événement `DonationReceived` |
| `n'ajoute pas deux fois le même donateur` | Même adresse donne 2 fois → `donors.length = 1`, `contributions = 2 ETH` |
| `refuse un don sous le minimum` | Don de 0.01 ETH (min = 0.1) → revert `"Don trop faible"` |
| `refuse un don après la deadline` | Deadline passée → revert `"Campagne terminee"` |
| `refuse un envoi direct d'ETH` | Envoyer de l'ETH sans appeler `contribute()` → revert (pas de `receive()`) |

### Bloc 3 — États et temps (F3, RG3) : 4 tests

| Test | Ce qu'il vérifie |
|------|------------------|
| `réussie si total >= objectif après la deadline` | 11 ETH ≥ 10 ETH + deadline passée → `Successful` |
| `échouée si total < objectif après la deadline` | 3 ETH < 10 ETH + deadline passée → `Failed` |
| `reste en cours même si l'objectif est atteint avant la deadline` | 10 ETH ≥ 10 ETH mais deadline PAS passée → `Ongoing` |
| `timeLeft diminue puis vaut 0` | Avant la deadline: > 0. Après: = 0 |

### Bloc 4 — Demande de retrait (F4) : 6 tests

| Test | Ce qu'il vérifie |
|------|------------------|
| `refuse si la campagne n'est pas réussie` | Campagne échouée → revert `"Campagne non reussie"` |
| `refuse avant la deadline` | Campagne en cours (même si objectif atteint) → revert `"Campagne non reussie"` |
| `refuse si l'appelant n'est pas le créateur` | Un donateur essaye → revert `"Createur uniquement"` |
| `refuse un montant supérieur au solde` | Demande 12 ETH (solde = 11) → revert `"Montant invalide"` |
| `refuse un destinataire nul` | Adresse 0x0 → revert `"Destinataire invalide"` |
| `crée la demande et émet l'événement` | Création correcte → `withdrawRequestsCount = 1` + événement |

### Bloc 5 — Vote et retrait (F5, RG4) : 9 tests

| Test | Ce qu'il vérifie |
|------|------------------|
| `enregistre un vote et émet l'événement` | Vote → `approvals = 1` + événement `WithdrawVote` |
| `refuse le vote d'un non-donateur` | Stranger vote → revert `"Pas donateur"` |
| `refuse le double vote` | Même donateur vote 2 fois → revert `"Deja vote"` |
| `refuse un vote sur une demande inexistante` | ID = 99 → revert `"Demande inexistante"` |
| `refuse le retrait sous 50 %` | 1 vote sur 3 donateurs → revert `"Moins de 50% d'approbation"` |
| `accepte le retrait à partir de 50 %` | 2 votes sur 3 → le destinataire reçoit 5 ETH |
| `émet FundsWithdrawn` | Retrait réussi → événement `FundsWithdrawn` émis |
| `refuse un second retrait de la même demande` | Double exécution → revert `"Deja execute"` |
| `refuse le vote sur une demande déjà exécutée` | Vote après exécution → revert `"Deja execute"` |
| `refuse le retrait par un non-créateur` | Donateur tente d'exécuter → revert `"Createur uniquement"` |
| `refuse le retrait d'une demande inexistante` | ID = 42 → revert `"Demande inexistante"` |
| `refuse le cumul de demandes au-delà du solde` | 2 demandes (5 + 8 = 13 > 11 ETH solde) → la 2e échoue à l'exécution |

### Bloc 6 — Remboursement (F6, RG5) : 7 tests

| Test | Ce qu'il vérifie |
|------|------------------|
| `rembourse exactement la contribution` | d1 a donné 1 ETH → reçoit exactement 1 ETH |
| `émet l'événement Refunded` | Remboursement → événement `Refunded(adresse, montant)` |
| `refuse un second remboursement` | Déjà remboursé → revert `"Rien a rembourser"` |
| `refuse le remboursement d'un non-donateur` | N'a jamais donné → revert `"Rien a rembourser"` |
| `refuse le remboursement si la campagne réussit` | Campagne `Successful` → revert `"Remboursement impossible"` |
| `refuse le remboursement avant la deadline` | Campagne `Ongoing` → revert `"Remboursement impossible"` |
| `vide le contrat quand tout le monde est remboursé` | Tous remboursés → solde du contrat = 0 |

---

## 9. Tests unitaires — Crowdfunding.js

**Fichier :** `test/Crowdfunding.js` — **4 tests**

| Test | Ce qu'il vérifie |
|------|------------------|
| `démarre sans projet` | `getProjectsCount() = 0` à la création |
| `crée un projet et émet ProjectCreated` | `createProject()` → compteur passe à 1 + événement émis |
| `le créateur du projet est l'appelant, pas la fabrique` | `project.creator()` = adresse de l'utilisateur, pas de la fabrique |
| `propage les refus de validation du Project` | Objectif = 0 via la fabrique → revert `"Objectif invalide"` |

---

## 10. Scripts utilitaires

### `scripts/simulate.js` — Simulation complète sans interface

**Usage :**
```bash
# Terminal 1 :
npm run node

# Terminal 2 :
npm run simulate
```

Ce script joue **2 scénarios complets** en automatique contre le nœud local. Chaque ligne affiche `[OK]` (action réussie) ou `[REFUSE]` (action rejetée). Les refus sont **attendus** — ils vérifient que les protections fonctionnent.

**Scénario A — Campagne réussie (objectif 5 ETH) :**
1. Crée un projet avec objectif = 5 ETH, minimum = 0.1 ETH, durée = 60s
2. d1 donne 2 ETH → `[OK]`
3. d2 donne 2 ETH → `[OK]`
4. d3 donne 0.01 ETH → `[REFUSE]` (sous le minimum)
5. d3 donne 2 ETH → `[OK]` (total = 6 ETH ≥ 5 ETH)
6. Créateur demande un retrait avant la deadline → `[REFUSE]`
7. Avance le temps de 61 secondes → statut passe à `Réussie`
8. d1 essaie de donner après la deadline → `[REFUSE]`
9. d1 essaie de créer une demande de retrait → `[REFUSE]` (pas le créateur)
10. Créateur crée une demande de 4 ETH → `[OK]`
11. d1 vote → `[OK]`
12. d1 revote → `[REFUSE]` (double vote)
13. Retrait avec 1 vote sur 3 → `[REFUSE]` (< 50 %)
14. d2 vote → `[OK]` (maintenant 2/3 = 67 %)
15. Retrait avec 2 votes sur 3 → `[OK]`, le destinataire reçoit 4 ETH
16. Second retrait du même ID → `[REFUSE]` (déjà exécuté)

**Scénario B — Campagne échouée (objectif 50 ETH) :**
1. Crée un projet avec objectif = 50 ETH
2. d1 donne 1 ETH, d2 donne 2 ETH (total = 3 ETH << 50 ETH)
3. d1 essaie de se rembourser avant la deadline → `[REFUSE]`
4. Avance le temps → statut passe à `Échouée`
5. d1 se rembourse → `[OK]` (reçoit ~1 ETH)
6. d1 se rembourse une 2e fois → `[REFUSE]` (déjà remboursé)
7. Non-donateur se rembourse → `[REFUSE]` (rien à rembourser)
8. d2 se rembourse → `[OK]`
9. Solde du contrat = 0 ETH

### `scripts/fastForward.js` — Avancer le temps

```bash
SECONDS=120 npm run ff       # Avance de 120 secondes
npm run ff                    # Avance de 3600 secondes par défaut
```

Utile pour faire passer la deadline d'une campagne lors de tests manuels sur le nœud local.

### `scripts/syncAbi.js` — Exporter les ABI

```bash
npm run sync
```

Copie les ABI (interfaces des contrats au format JSON) et l'adresse déployée dans un dossier `frontend/src/abi/`. Sera utilisé quand l'interface web sera développée.

---

## 11. Configuration et déploiement

### `hardhat.config.js`

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.24",
  networks: {
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
  },
};
```

- **Solidity 0.8.24** : version du compilateur. Le `^0.8.24` dans le contrat signifie "0.8.24 ou supérieur dans la branche 0.8"
- **localhost** : se connecte au nœud Hardhat lancé par `npm run node`
- **chainId 31337** : identifiant standard du réseau de test Hardhat

### `ignition/modules/Crowdfunding.js`

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CrowdfundingModule", (m) => {
  const crowdfunding = m.contract("Crowdfunding");
  return { crowdfunding };
});
```

Hardhat Ignition est le système de déploiement. Ce module déploie **uniquement la fabrique**. Les projets individuels sont ensuite créés par `createProject()`.

### Commandes npm

| Commande | Action |
|----------|--------|
| `npm run compile` | Compile les contrats Solidity → génère `artifacts/` |
| `npm run test` | Exécute les 31 tests unitaires |
| `npm run coverage` | Exécute les tests avec un rapport de couverture de code |
| `npm run node` | Lance un nœud blockchain local sur le port 8545 |
| `npm run deploy` | Déploie la fabrique sur le nœud local |
| `npm run deploy:reset` | Redéploie (efface le déploiement précédent) |
| `npm run simulate` | Joue les scénarios A et B sur le nœud local |
| `npm run ff` | Avance le temps de la blockchain locale |
| `npm run sync` | Copie les ABI pour le frontend |

---

## 12. Sécurité

### Protection anti-réentrance

**Le problème :** Quand un contrat envoie de l'ETH à une adresse, cette adresse peut être un autre contrat qui possède une fonction `receive()`. Ce contrat malveillant peut, à l'intérieur de `receive()`, rappeler `refund()` avant que la première exécution ne soit terminée. Résultat : il récupère son argent deux fois (ou plus).

**La solution dans Project.sol :** Le pattern "Checks-Effects-Interactions" (CEI) :

```solidity
// 1. CHECKS   — vérifications
require(getStatus() == State.Failed, "Remboursement impossible");
uint256 amount = contributions[msg.sender];
require(amount > 0, "Rien a rembourser");

// 2. EFFECTS  — modifier l'état AVANT d'envoyer l'ETH
contributions[msg.sender] = 0;            // ← si le contrat rappelle refund(),
                                           //   contributions sera déjà à 0
                                           //   → "Rien a rembourser" → revert

// 3. INTERACTIONS — envoyer l'ETH
(bool ok, ) = payable(msg.sender).call{value: amount}("");
require(ok, "Echec du remboursement");
```

Le même pattern est utilisé dans `withdrawRequestedAmount()` où `r.executed = true` est mis **avant** l'appel `call`.

### Protection contre l'envoi direct d'ETH

Le contrat n'a **pas** de fonction `receive()` ni `fallback()`. Si quelqu'un essaie d'envoyer de l'ETH directement (sans appeler `contribute()`), la transaction est automatiquement rejetée par l'EVM.

### Protection contre le double vote

```solidity
mapping(uint256 => mapping(address => bool)) public hasVoted;
```

Avant chaque vote, le contrat vérifie `!hasVoted[id][msg.sender]`. Après le vote, il met `hasVoted[id][msg.sender] = true`. Impossible de voter deux fois.

### Protection contre le double retrait

Le champ `executed` dans `WithdrawRequest` est vérifié (`!r.executed`) avant chaque retrait et mis à `true` immédiatement. Une demande exécutée ne peut pas être exécutée à nouveau.

### Protection contre les retraits excessifs

Même si deux demandes sont créées et votées, le contrat vérifie le solde réel au moment du retrait :
```solidity
require(address(this).balance >= r.amount, "Solde insuffisant");
```

---

## 13. Référence des messages d'erreur

| Message | Fonction | Signification |
|---------|----------|---------------|
| `Createur invalide` | constructor | L'adresse du créateur est 0x0 |
| `Objectif invalide` | constructor | L'objectif est 0 |
| `Don minimum invalide` | constructor | Le don minimum est 0 |
| `Duree invalide` | constructor | La durée est 0 |
| `Campagne terminee` | contribute() | La deadline est passée |
| `Don trop faible` | contribute() | Le montant envoyé est < minContribution |
| `Createur uniquement` | onlyCreator | L'appelant n'est pas le créateur |
| `Campagne non reussie` | createWithdrawRequest() | Le statut n'est pas Successful |
| `Destinataire invalide` | createWithdrawRequest() | L'adresse du destinataire est 0x0 |
| `Montant invalide` | createWithdrawRequest() | Le montant est 0 ou > solde du contrat |
| `Demande inexistante` | vote/withdraw | L'ID de la demande n'existe pas |
| `Pas donateur` | voteWithdrawRequest() | L'appelant n'a jamais donné |
| `Deja execute` | vote/withdraw | La demande a déjà été exécutée |
| `Deja vote` | voteWithdrawRequest() | L'appelant a déjà voté sur cette demande |
| `Moins de 50% d'approbation` | withdrawRequestedAmount() | Pas assez de votes favorables |
| `Solde insuffisant` | withdrawRequestedAmount() | Le contrat n'a pas assez d'ETH |
| `Echec du virement` | withdrawRequestedAmount() | L'envoi d'ETH au destinataire a échoué |
| `Remboursement impossible` | refund() | La campagne n'est pas en état Failed |
| `Rien a rembourser` | refund() | L'appelant n'a pas de contribution (ou déjà remboursé) |
| `Echec du remboursement` | refund() | L'envoi d'ETH au donateur a échoué |

---

## 14. Référence des événements

| Événement | Émis par | Champs |
|-----------|----------|--------|
| `ProjectCreated` | Crowdfunding.createProject() | `project` (address), `creator` (address), `title` (string), `goal` (uint256), `deadline` (uint256) |
| `DonationReceived` | Project.contribute() | `donor` (address), `amount` (uint256) |
| `WithdrawRequestCreated` | Project.createWithdrawRequest() | `id` (uint256), `amount` (uint256), `recipient` (address), `reason` (string) |
| `WithdrawVote` | Project.voteWithdrawRequest() | `id` (uint256), `voter` (address) |
| `FundsWithdrawn` | Project.withdrawRequestedAmount() | `id` (uint256), `amount` (uint256), `recipient` (address) |
| `Refunded` | Project.refund() | `donor` (address), `amount` (uint256) |

Les champs marqués `indexed` sont recherchables sur la blockchain (filtres). Les événements ne coûtent pas de gas de stockage — ils sont dans les logs, pas dans le state.

---

## 15. Structure complète du projet

```
crowdfunding-dapp/
│
├── contracts/                          # Code Solidity
│   ├── Crowdfunding.sol                # Fabrique (41 lignes)
│   └── Project.sol                     # Campagne (141 lignes)
│
├── test/                               # Tests unitaires JavaScript
│   ├── Crowdfunding.js                 # 4 tests pour la fabrique
│   └── Project.js                      # 27 tests pour la campagne
│
├── scripts/                            # Scripts utilitaires
│   ├── simulate.js                     # Simulation complète (scénarios A et B)
│   ├── fastForward.js                  # Avancer le temps de la blockchain
│   └── syncAbi.js                      # Exporter les ABI pour le frontend
│
├── ignition/modules/                   # Déploiement
│   └── Crowdfunding.js                 # Module Hardhat Ignition
│
├── docs/                               # Documentation
│   ├── CahierDesCharges.pdf            # Cahier des charges original
│   ├── Reference.md                    # Référence technique détaillée
│   └── README.md                       # CE FICHIER
│
├── hardhat.config.js                   # Configuration Hardhat
├── package.json                        # Dépendances et scripts npm
├── package-lock.json                   # Verrou des versions
├── .gitignore                          # Fichiers ignorés par Git
└── README.md                           # Instructions rapides
```

