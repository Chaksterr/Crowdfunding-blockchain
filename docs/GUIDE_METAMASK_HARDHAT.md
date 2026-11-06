# Guide Complet : Validation Blockchain, MetaMask & Intégration Frontend

Ce document est le **guide de référence officiel** pour :
1. Valider que la couche blockchain fonctionne à 100 % en local.
2. Configurer MetaMask pour interagir avec le nœud local Hardhat.
3. Fournir à l'équipe Frontend toutes les spécifications, ABI, méthodes et pièges à éviter pour connecter l'interface web en toute confiance.

---

## 1. Validation de la Blockchain à 100 % (En Ligne de Commande)

Avant de toucher au frontend ou à MetaMask, vous pouvez valider de manière autonome l'ensemble des règles de gestion directement depuis votre terminal.

### Étape 1.1 : Compiler les contrats

```bash
npm run compile
```

- **Ce qui se passe :** Hardhat compile `Crowdfunding.sol` et `Project.sol` avec Solidity `0.8.24`.
- **Résultat attendu :**
  ```text
  Compiled 2 Solidity files successfully (or Nothing to compile)
  ```
- Les fichiers compilés sont générés dans `artifacts/`.

---

### Étape 1.2 : Lancer la suite complète de tests unitaires

```bash
npm run test
```

- **Ce qui se passe :** Hardhat exécute **31 tests automatisés** couvrant :
  - La fabrique `Crowdfunding` (4 tests)
  - Le déploiement et les règles RG1 (5 tests)
  - Les dons et règles RG2 (5 tests)
  - Le calcul des états `Ongoing / Successful / Failed` et du temps (4 tests)
  - Les demandes de retrait et autorisations (6 tests)
  - Le système de vote à 50 % et retrait effectif (12 tests)
  - Les remboursements en cas d'échec RG5 et protection anti-réentrance (7 tests)
- **Résultat attendu :**
  ```text
  31 passing (X s)
  ```
  Tous les tests doivent être au vert.

---

### Étape 1.3 : Lancer le nœud local Hardhat

Ouvrez un **Terminal 1** et laissez-le tourner :

```bash
npm run node
```

- **Ce qui se passe :** Hardhat démarre une blockchain Ethereum locale complète à l'adresse :
  - **RPC URL :** `http://127.0.0.1:8545`
  - **Chain ID :** `31337`
- Hardhat génère automatiquement **20 comptes de test** pré-financés avec **10 000 ETH virtuels chacun**, ainsi que leurs adresses et clés privées correspondantes.

> [!IMPORTANT]
> **Laissez ce terminal ouvert.** Si vous le fermez, la blockchain locale s'arrête.

---

### Étape 1.4 : Déployer la fabrique sur le nœud local

Dans un **Terminal 2** (à côté du Terminal 1) :

```bash
npm run deploy
```

- **Ce qui se passe :** Hardhat Ignition déploie le contrat `Crowdfunding` (la fabrique) sur votre nœud local.
- **Résultat attendu :**
  ```text
  Hardhat Ignition 🚀
  Deploying [ CrowdfundingModule ]
  Batch #1
    Executed CrowdfundingModule#Crowdfunding
  [ CrowdfundingModule ] successfully deployed 
  ```
- L'adresse déployée est enregistrée dans `ignition/deployments/chain-31337/deployed_addresses.json`.

*(Si vous redémarrez le nœud local à zéro plus tard, utilisez `npm run deploy:reset`).*

---

### Étape 1.5 : Exécuter la simulation complète (Scénarios A et B)

Toujours dans le **Terminal 2** :

```bash
npm run simulate
```

Ce script simule de A à Z le cycle de vie de deux campagnes sans aucune interface :

- **Scénario A (Campagne Réussie - Objectif 5 ETH) :**
  - Des donateurs contribuent (un don sous le minimum est bien refusé).
  - Le créateur tente de retirer avant la deadline $\rightarrow$ `[REFUSE]` (attendu).
  - Avancement automatique du temps passé la deadline $\rightarrow$ Statut passe à "Reussie".
  - Tentative de don après deadline $\rightarrow$ `[REFUSE]` (attendu).
  - Création d'une demande de retrait de 4 ETH par le créateur.
  - Vote des donateurs : 1 vote sur 3 $\rightarrow$ tentative de retrait `[REFUSE]` (< 50%).
  - 2e vote (2 sur 3 $\ge$ 50%) $\rightarrow$ Retrait validé `[OK]`, le destinataire reçoit 4 ETH.
  - Tentative de double retrait $\rightarrow$ `[REFUSE]` (attendu).
- **Scénario B (Campagne Échouée - Objectif 50 ETH) :**
  - Des donateurs contribuent 3 ETH au total.
  - Tentative de remboursement avant deadline $\rightarrow$ `[REFUSE]` (attendu).
  - Avancement du temps passé la deadline $\rightarrow$ Statut passe à "Echouee".
  - Les donateurs réclament leur remboursement $\rightarrow$ `[OK]`, chaque donateur récupère sa mise.
  - Tentative de double remboursement $\rightarrow$ `[REFUSE]` (attendu).
  - Solde final du contrat : 0 ETH.

> [!TIP]
> Quand chaque ligne marquée `[REFUSE]` est bien refusée et les lignes normales sont `[OK]`, vous avez la certitude mathématique que les smart contracts fonctionnent à 100 %.

---

### Étape 1.6 : Exporter les ABI et l'adresse pour le Frontend

```bash
npm run sync
```

- **Ce qui se passe :** Ce script lit les contrats compilés et l'adresse déployée, puis génère automatiquement :
  - `frontend/src/abi/Crowdfunding.json`
  - `frontend/src/abi/Project.json`
  - `frontend/src/deployed.json` (contenant `{ "address": "0x..." }`)
- Vos amis développeurs front n'ont qu'à importer ces fichiers JSON dans leur application !

---

## 2. Configuration de MetaMask avec Hardhat

Pour que vos amis ou vous-même puissiez tester l'interface avec MetaMask, voici la configuration exacte.

### 2.1 Ajouter le Réseau Hardhat dans MetaMask

1. Ouvrez l'extension **MetaMask**.
2. Cliquez sur le sélecteur de réseau en haut à gauche $\rightarrow$ **Ajouter un réseau** $\rightarrow$ **Ajouter un réseau manuellement**.
3. Remplissez les champs avec ces valeurs exactes :

| Champ | Valeur exacte |
|---|---|
| **Nom du réseau** | `Hardhat Localhost` |
| **Nouvelle URL de RPC** | `http://127.0.0.1:8545` |
| **ID de chaîne** | `31337` |
| **Symbole de la devise** | `ETH` |
| **URL de l'explorateur de blocs** | *(laisser vide)* |

4. Cliquez sur **Enregistrer** et basculez sur ce réseau.

---

### 2.2 Importer des Comptes de Test (Pré-financés à 10 000 ETH)

Lorsque vous lancez `npm run node`, Hardhat affiche 20 comptes avec leurs clés privées.
Voici les 3 premiers comptes standard générés par Hardhat :

#### Compte #0 (Utile comme Créateur de Projet) :
- **Adresse :** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Clé privée :** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

#### Compte #1 (Utile comme Donateur 1) :
- **Adresse :** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Clé privée :** `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

#### Compte #2 (Utile comme Donateur 2) :
- **Adresse :** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Clé privée :** `0x5de4111afa1a4b94908f83103eb2f95404b712f94d9354972e04e76510006439`

#### Procédure pour importer dans MetaMask :
1. Dans MetaMask, cliquez sur le menu des comptes (cercle coloré en haut).
2. Cliquez sur **Ajouter un compte ou un portefeuille matériel** $\rightarrow$ **Importer un compte**.
3. Sélectionnez le type **Clé privée**, collez la clé privée (ex: celle du Compte #0).
4. Cliquez sur **Importer**.
5. Le compte apparaît immédiatement avec **10 000 ETH** de solde !
6. Répétez l'opération pour importer au moins 2 comptes (1 créateur et 1 ou 2 donateurs) afin de pouvoir tester les votes et contributions en changeant de compte dans MetaMask.

---

### 2.3 Le Piège Critique : Erreur "Nonce too high" ou transaction bloquée

> [!WARNING]
> **Problème fréquent :**
> Si vous arrêtez le terminal `npm run node` puis le relancez, la blockchain locale redémarre au bloc 0 avec un compteur de transaction (nonce) remis à zéro.
> Cependant, MetaMask a mémorisé le nonce des transactions précédentes !
> Cela provoque l'erreur : **`Nonce too high`** ou des transactions qui restent indéfiniment "En attente".

#### Solution immédiate (à transmettre absolument à l'équipe Front) :
1. Dans MetaMask, cliquez sur les **trois petits points** en haut à droite (ou l'icône de profil) $\rightarrow$ **Paramètres**.
2. Allez dans **Avancé**.
3. Cliquez sur **Effacer les données de l'onglet activité** (ou *Clear activity tab data* / *Réinitialiser le compte*).
4. Cela réinitialise l'historique local de MetaMask pour ce compte sans perdre la clé privée ni les fonds. Vos transactions repasseront instantanément !

---

## 3. Guide d'Intégration pour les Développeurs Frontend

Transmettez cette section à vos amis qui créent l'interface (React, Vite, Next.js, Vue, etc.).

### 3.1 Connexion au Wallet avec Ethers.js v6

```javascript
import { ethers } from "ethers";

// 1. Vérifier si MetaMask est installé
if (!window.ethereum) {
  alert("Veuillez installer MetaMask !");
}

// 2. Demander la connexion du compte
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const userAddress = await signer.getAddress();

// 3. Vérifier le bon réseau (Chain ID 31337 = 0x7a69 en hexadécimal)
const network = await provider.getNetwork();
if (network.chainId !== 31337n) {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x7a69" }], // 31337 en hexadécimal
  });
}
```

---

### 3.2 Instancier les Contrats

```javascript
import CrowdfundingAbi from "./abi/Crowdfunding.json";
import ProjectAbi from "./abi/Project.json";
import deployedConfig from "./deployed.json";

// Le contrat Fabrique
const factoryContract = new ethers.Contract(
  deployedConfig.address,
  CrowdfundingAbi,
  signer
);

// Pour un contrat Projet spécifique (obtenu depuis la liste)
function getProjectContract(projectAddress) {
  return new ethers.Contract(projectAddress, ProjectAbi, signer);
}
```

---

### 3.3 Méthodes de la Fabrique (`Crowdfunding.sol`)

| Méthode | Paramètres | Description |
|---|---|---|
| `getProjects()` | aucun | Retourne un tableau d'adresses `string[]` de tous les projets créés. |
| `getProjectsCount()` | aucun | Retourne le nombre total de projets (`bigint`). |
| `createProject(...)` | `title` (string), `description` (string), `goal` (bigint en wei), `minContribution` (bigint en wei), `duration` (secondes) | Déploie un nouveau projet. L'utilisateur connecté devient le `creator`. |

#### Exemple : Créer un projet depuis le frontend
```javascript
// Objectif: 5 ETH, Min: 0.1 ETH, Durée: 7 jours (7 * 24 * 3600 secondes)
const goalInWei = ethers.parseEther("5.0");
const minInWei = ethers.parseEther("0.1");
const durationInSeconds = 7 * 24 * 3600;

const tx = await factoryContract.createProject(
  "Sauvetage des abeilles",
  "Financement de 10 ruches connectées",
  goalInWei,
  minInWei,
  durationInSeconds
);
await tx.wait(); // Attendre la validation du bloc
```

---

### 3.4 Méthodes d'un Projet (`Project.sol`)

#### A. Fonctions de Lecture (View - Gratuit, pas de transaction)

```javascript
const project = getProjectContract(projectAddress);

// Informations de base (immutables)
const creator = await project.creator();             // address
const goal = await project.goal();                   // bigint en wei -> ethers.formatEther(goal)
const minContribution = await project.minContribution(); // bigint en wei
const deadline = await project.deadline();           // timestamp Unix (secondes) -> new Date(Number(deadline) * 1000)

// État dynamique
const title = await project.title();                 // string
const description = await project.description();     // string
const totalRaised = await project.totalRaised();     // bigint en wei
const timeLeft = await project.timeLeft();           // secondes restantes (0 si fini)
const donors = await project.getDonors();             // address[]
const status = await project.getStatus();           // 0: Ongoing, 1: Failed, 2: Successful

// Contribution de l'utilisateur connecté
const myContribution = await project.contributions(userAddress); // bigint en wei
```

#### B. Fonctions d'Écriture (Transactions MetaMask)

##### 1. Donner (`contribute`)
```javascript
// Donner 0.5 ETH
const amount = ethers.parseEther("0.5");
const tx = await project.contribute({ value: amount });
await tx.wait();
```

##### 2. Créer une demande de retrait (Créateur uniquement, statut Successful)
```javascript
// Demander 2 ETH pour acheter du matériel à envoyer au fournisseur
const amount = ethers.parseEther("2.0");
const tx = await project.createWithdrawRequest(
  amount,
  "Achat de matériel apicole",
  supplierAddress
);
await tx.wait();
```

##### 3. Voter pour une demande (Donateurs uniquement)
```javascript
// Voter pour la demande avec l'index 0
const tx = await project.voteWithdrawRequest(0);
await tx.wait();
```

##### 4. Exécuter un retrait (Créateur uniquement, après $\ge 50\%$ de votes)
```javascript
const tx = await project.withdrawRequestedAmount(0);
await tx.wait();
```

##### 5. Réclamer un remboursement (Donateurs uniquement, statut Failed)
```javascript
const tx = await project.refund();
await tx.wait();
```

---

### 3.5 Conversion des Unités et Dates (Aide UI)

```javascript
// Wei -> ETH lisible pour l'UI
const ethString = ethers.formatEther(totalRaised); // ex: "5.0"

// ETH -> Wei pour envoyer au contrat
const weiBigInt = ethers.parseEther("0.25");

// Formater la date limite
const deadlineDate = new Date(Number(deadline) * 1000).toLocaleString();

// Statut en texte
const STATUS_LABELS = ["En cours", "Échouée", "Réussie"];
const currentStatusLabel = STATUS_LABELS[Number(status)];
```

---

### 3.6 Logique des Boutons dans l'Interface

Pour une UX intuitive, activez les boutons selon le tableau suivant :

| Rôle de l'utilisateur | Statut Campagne | Boutons à afficher / activer |
|---|---|---|
| **N'importe qui** | `Ongoing` (0) | Champ montant + Bouton **"Donner"** |
| **Créateur** | `Ongoing` (0) | Message : "Collecte en cours jusqu'au [date]" |
| **Créateur** | `Successful` (2) | Bouton **"Créer une demande de retrait"** |
| **Donateur** | `Successful` (2) | Bouton **"Voter"** sur les demandes en attente (désactivé si `hasVoted == true`) |
| **Créateur** | `Successful` (2) | Bouton **"Effectuer le virement"** (activé si `approvals * 2 >= donors.length`) |
| **Donateur** | `Failed` (1) | Bouton **"Demander mon remboursement"** (activé si `contributions > 0`) |
| **Non-donateur** | `Failed` (1) | Message : "Campagne terminée sans atteindre l'objectif" |

---

## 4. Checklist Finale pour Vos Amis

Avant de coder le frontend, assurez-vous d'avoir :
- [x] Node.js v18 ou plus récent installé.
- [x] Démarré le nœud local : `npm run node` (Terminal 1).
- [x] Déployé la fabrique : `npm run deploy` (Terminal 2).
- [x] Synchronisé les ABI : `npm run sync`.
- [x] Ajouté le réseau Hardhat (RPC `http://127.0.0.1:8545`, Chain ID `31337`) dans MetaMask.
- [x] Importé au moins 2 comptes de test dans MetaMask via leurs clés privées.
- [x] Noté la manipulation "Effacer les données de l'onglet activité" en cas d'erreur de nonce.

Vous pouvez envoyer le dossier du projet et ce document directement à votre équipe : tout est validé, autonome et prêt pour l'intégration web !

