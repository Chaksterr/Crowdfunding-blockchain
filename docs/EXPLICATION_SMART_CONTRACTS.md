# Explication Détaillée des Smart Contracts (Étape par Étape)

Ce document décortique de manière pédagogique et exhaustive les deux smart contracts du projet :
1. [**`contracts/Crowdfunding.sol`** (La Fabrique de Campagnes)](#1-contrat-crowdfundingsol--la-fabrique)
2. [**`contracts/Project.sol`** (La Campagne et le Coffre-Fort)](#2-contrat-projectsol--le-coffre-fort-de-campagne)

---

# 1. Contrat `Crowdfunding.sol` — La Fabrique

Ce contrat fait office de **registre décentralisé** et d'**usine** (*Factory pattern*). Il ne manipule aucun fonds (aucun ETH n'y transite). Son unique rôle est de déployer de nouvelles campagnes et de mémoriser leurs adresses pour l'interface web.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Project.sol";
```

### Étape 1.1 : En-tête et Dépendances
- **`// SPDX-License-Identifier: MIT`** : Identifiant standard de licence open-source.
- **`pragma solidity ^0.8.24;`** : Indique au compilateur d'utiliser la version 0.8.24 de Solidity. Cette version intègre par défaut la protection contre les dépassements d'entiers (*overflow / underflow arithmetic*).
- **`import "./Project.sol";`** : Importe la définition du contrat `Project` afin que la fabrique puisse le compiler et l'instancier avec l'opérateur `new`.

---

### Étape 1.2 : Variables d'état

```solidity
Project[] public projects;
```
- **Rôle :** Tableau dynamique qui stocke les adresses de toutes les campagnes créées depuis le début.
- **Visibilité `public` :** Solidity crée automatiquement un *getter* pour lire un élément par son index : `projects(index)`.

---

### Étape 1.3 : Événement `ProjectCreated`

```solidity
event ProjectCreated(
    address indexed project,
    address indexed creator,
    string title,
    uint256 goal,
    uint256 deadline
);
```
- **Rôle :** Un événement écrit des données dans les logs de la blockchain (moins coûteux en gas que le stockage classique).
- **`indexed` :** Permet à l'application web ou à The Graph de filtrer les événements (par exemple : "trouver tous les projets créés par telle adresse").

---

### Étape 1.4 : Fonction `createProject`

```solidity
function createProject(
    string calldata title,
    string calldata description,
    uint256 goal,
    uint256 minContribution,
    uint256 duration
) external returns (address) {
    Project p = new Project(msg.sender, title, description, goal, minContribution, duration);
    projects.push(p);
    emit ProjectCreated(address(p), msg.sender, title, goal, p.deadline());
    return address(p);
}
```

#### Décryptage pas à pas :
1. **`string calldata` :** `calldata` est un espace mémoire en lecture seule pour les arguments d'entrée. C'est plus économique en gas que `memory`.
2. **`Project p = new Project(msg.sender, ...)` :** 
   - L'opérateur `new` déploie un **nouveau contrat autonome** sur la blockchain.
   - **Crucial :** On passe `msg.sender` au constructeur de `Project`. Ainsi, le **créateur officiel** de la campagne est l'utilisateur connecté qui a signé la transaction, et **non la fabrique**.
3. **`projects.push(p);` :** Enregistre la nouvelle adresse dans le tableau global.
4. **`emit ProjectCreated(...)` :** Émet l'événement avec les détails pour informer l'extérieur.
5. **`return address(p);` :** Renvoie l'adresse de la nouvelle campagne créée.

---

### Étape 1.5 : Fonctions de lecture pour le Frontend

```solidity
function getProjects() external view returns (Project[] memory) {
    return projects;
}

function getProjectsCount() external view returns (uint256) {
    return projects.length;
}
```
- **`getProjects()` :** Retourne la liste complète des adresses de projets sous forme de tableau. L'interface web appelle cette fonction une seule fois au chargement pour afficher toutes les campagnes.
- **`getProjectsCount()` :** Retourne le nombre total de campagnes sans avoir à transférer tout le tableau.

---

# 2. Contrat `Project.sol` — Le Coffre-Fort de Campagne

C'est le contrat central. Chaque campagne déployée est une instance indépendante de ce contrat. Il détient les ETH séquestrés, compte les donateurs, gère les votes et exécute les retraits ou remboursements.

---

### Étape 2.1 : Types de données (`enum` et `struct`)

```solidity
enum State { Ongoing, Failed, Successful } // 0, 1, 2
```
- Représente les 3 états possibles d'une campagne :
  - `0 = Ongoing` : En cours de collecte (deadline non atteinte).
  - `1 = Failed` : Échouée (deadline dépassée et objectif non atteint).
  - `2 = Successful` : Réussie (deadline dépassée et objectif atteint).
- **Particularité architecturale :** Cet enum n'est **jamais stocké** dans une variable d'état permanente. Il est calculé dynamiquement par `getStatus()`.

```solidity
struct WithdrawRequest {
    uint256 amount;            // Montant demandé en wei
    string reason;             // Justification du créateur (ex: "Achat serveurs")
    address payable recipient; // Adresse qui recevra les fonds (fournisseur)
    uint256 approvals;         // Nombre de donateurs ayant voté OUI
    bool executed;             // true si le virement a déjà été effectué
}
```
- Structure représentant une demande de retrait d'argent soumise au vote des donateurs.

---

### Étape 2.2 : Paramètres Immutables

```solidity
address public immutable creator;
uint256 public immutable goal;
uint256 public immutable minContribution;
uint256 public immutable deadline;
```

- **Le mot-clé `immutable` :**
  - Ces 4 variables sont écrites **définitivement dans le bytecode** du contrat lors du constructeur.
  - Elles ne peuvent **plus jamais être modifiées**, par qui que ce soit.
  - **Avantages majeurs :** 
    1. **Confiance absolue :** Le créateur ne peut pas augmenter l'objectif en cours de route ou raccourcir la deadline.
    2. **Économie de gas :** Les variables immutables ne consomment pas d'espace de stockage `SLOAD`, leur lecture est quasi-gratuite.

---

### Étape 2.3 : Variables d'état Dynamiques

```solidity
string public title;
string public description;
uint256 public totalRaised;

mapping(address => uint256) public contributions;
address[] private donors;
WithdrawRequest[] public withdrawRequests;
mapping(uint256 => mapping(address => bool)) public hasVoted;
```

- **`totalRaised` :** Cumul des ETH reçus.
- **`contributions` :** Mapping associant chaque adresse au montant total qu'elle a donné.
- **`donors` (tableau privé d'adresses) :** 
  - *Pourquoi un tableau en plus du mapping ?* En Solidity, il est impossible de faire une boucle sur un mapping ou de connaître sa taille (`mapping.length` n'existe pas).
  - Le tableau `donors` conserve les adresses uniques des donateurs pour connaître le nombre total de votants (`donors.length`).
- **`withdrawRequests` :** Liste ordonnée de toutes les demandes de retrait.
- **`hasVoted` :** `hasVoted[idDemande][adresseDonateur] = true/false`. Empêche tout double vote sur une même demande.

---

### Étape 2.4 : Événements

```solidity
event DonationReceived(address indexed donor, uint256 amount);
event WithdrawRequestCreated(uint256 indexed id, uint256 amount, address recipient, string reason);
event WithdrawVote(uint256 indexed id, address indexed voter);
event FundsWithdrawn(uint256 indexed id, uint256 amount, address recipient);
event Refunded(address indexed donor, uint256 amount);
```
- Permettent à l'interface React d'écouter les actions en temps réel et de rafraîchir l'affichage instantanément dès qu'une transaction est minée.

---

### Étape 2.5 : Modificateur `onlyCreator`

```solidity
modifier onlyCreator() {
    require(msg.sender == creator, "Createur uniquement");
    _;
}
```
- Sécurise les fonctions réservées au créateur de la campagne. Si quelqu'un d'autre appelle la fonction, la transaction échoue immédiatement avec `"Createur uniquement"`.
- Le symbole `_;` représente l'emplacement où le corps de la fonction annotée sera exécuté.

---

### Étape 2.6 : Le Constructeur (Validation RG1)

```solidity
constructor(
    address _creator,
    string memory _title,
    string memory _description,
    uint256 _goal,
    uint256 _minContribution,
    uint256 _duration
) {
    require(_creator != address(0), "Createur invalide");
    require(_goal > 0, "Objectif invalide");               // RG1
    require(_minContribution > 0, "Don minimum invalide"); // RG1
    require(_duration > 0, "Duree invalide");              // RG1
    creator = _creator;
    title = _title;
    description = _description;
    goal = _goal;
    minContribution = _minContribution;
    deadline = block.timestamp + _duration;
}
```

#### Décryptage :
- Vérifie les 4 règles de validité avant d'initialiser :
  - Adresse créateur non nulle (`address(0)`).
  - Objectif $> 0$ (impossible de créer une campagne déjà financée à 0 ETH).
  - Don minimum $> 0$ (évite les transactions spam sans valeur).
  - Durée $> 0$ secondes (garantit que la deadline est obligatoirement dans le futur).
- `deadline = block.timestamp + _duration` : calcule la date de clôture exacte en timestamp Unix.

---

### Étape 2.7 : Calcul Dynamique de l'État et du Temps (F3)

```solidity
function getStatus() public view returns (State) {
    if (block.timestamp < deadline) return State.Ongoing;
    return totalRaised >= goal ? State.Successful : State.Failed;
}

function timeLeft() public view returns (uint256) {
    return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
}
```

#### Pourquoi ce choix d'architecture ?
- Dans beaucoup de projets débutants, l'état est stocké dans une variable modifiée manuellement. C'est une faille : si personne n'appelle de fonction pour clôturer la campagne, elle reste bloquée indéfiniment en "Ongoing".
- Ici, **`getStatus()` est une fonction purement déduite** de `block.timestamp`. Dès que la seconde fatidique de la deadline est dépassée, le statut bascule **automatiquement et irréversiblement** vers `Successful` ou `Failed`.

---

### Étape 2.8 : La Fonction `contribute()` — Donner (F2, RG2)

```solidity
function contribute() external payable {
    require(block.timestamp < deadline, "Campagne terminee");  // RG2
    require(msg.value >= minContribution, "Don trop faible");  // RG2
    if (contributions[msg.sender] == 0) donors.push(msg.sender);
    contributions[msg.sender] += msg.value;
    totalRaised += msg.value;
    emit DonationReceived(msg.sender, msg.value);
}
```

#### Décryptage ligne par ligne :
1. **`external payable` :** Le mot `payable` autorise la fonction à recevoir de l'ETH via `msg.value`.
2. **`require(block.timestamp < deadline, "Campagne terminee")` :** Refuse tout don si la date limite est atteinte ou passée.
3. **`require(msg.value >= minContribution, "Don trop faible")` :** Refuse tout montant inférieur au seuil fixé par le créateur.
4. **`if (contributions[msg.sender] == 0) donors.push(msg.sender);` :** Si c'est la toute première fois que cette adresse donne, on l'ajoute à la liste des donateurs. Si elle donne à nouveau, elle n'est **pas ajoutée en double** (1 personne physique = 1 voix de donateur).
5. **Mise à jour des soldes :** Incrémente la contribution de l'adresse et le montant global collecté.
6. **Émission de l'événement** pour notifier le frontend.

---

### Étape 2.9 : Création d'une Demande de Retrait (F4)

```solidity
function createWithdrawRequest(
    uint256 amount,
    string calldata reason,
    address payable recipient
) external onlyCreator {
    require(getStatus() == State.Successful, "Campagne non reussie");
    require(recipient != address(0), "Destinataire invalide");
    require(amount > 0 && amount <= address(this).balance, "Montant invalide");
    withdrawRequests.push(WithdrawRequest(amount, reason, recipient, 0, false));
    emit WithdrawRequestCreated(withdrawRequests.length - 1, amount, recipient, reason);
}
```

#### Décryptage :
1. **`onlyCreator` :** Seul le porteur de projet peut formuler des demandes d'utilisation des fonds.
2. **`getStatus() == State.Successful` :** Impossible de demander un retrait si la campagne n'a pas atteint son objectif ou si la deadline n'est pas passée.
3. **`amount <= address(this).balance` :** Le montant demandé ne peut pas dépasser les ETH actuellement disponibles dans le contrat.
4. La demande est créée avec `approvals = 0` et `executed = false`.

---

### Étape 2.10 : Voter sur une Demande (F5, RG4)

```solidity
function voteWithdrawRequest(uint256 id) external {
    require(id < withdrawRequests.length, "Demande inexistante");
    require(contributions[msg.sender] > 0, "Pas donateur");
    require(!withdrawRequests[id].executed, "Deja execute");
    require(!hasVoted[id][msg.sender], "Deja vote"); // anti double vote
    hasVoted[id][msg.sender] = true;
    withdrawRequests[id].approvals++;
    emit WithdrawVote(id, msg.sender);
}
```

#### Décryptage des 4 verrous de sécurité :
1. **ID valide :** La demande doit exister dans le tableau.
2. **Statut de donateur :** `contributions[msg.sender] > 0` garantit que seuls ceux qui ont financé le projet ont le droit de vote. Un étranger est refoulé.
3. **Non exécutée :** Inutile de voter pour une dépense déjà payée.
4. **Anti-double vote :** Vérifie que `hasVoted[id][msg.sender]` est faux, puis le passe à `true` avant d'incrémenter le compteur d'approbations.

---

### Étape 2.11 : Exécuter un Retrait Approuvé (F5, RG4)

```solidity
function withdrawRequestedAmount(uint256 id) external onlyCreator {
    require(id < withdrawRequests.length, "Demande inexistante");
    WithdrawRequest storage r = withdrawRequests[id];
    require(!r.executed, "Deja execute");
    require(r.approvals * 2 >= donors.length, "Moins de 50% d'approbation"); // RG4
    require(address(this).balance >= r.amount, "Solde insuffisant");
    r.executed = true; // EFFET avant INTERACTION
    (bool ok, ) = r.recipient.call{value: r.amount}("");
    require(ok, "Echec du virement");
    emit FundsWithdrawn(id, r.amount, r.recipient);
}
```

#### Décryptage approfondi :
1. **`r.approvals * 2 >= donors.length` :**
   - *Pourquoi cette formule ?* En Solidity, la division entière tronque les décimales (ex: $3 / 2 = 1$). Si on écrivait `approvals >= donors.length / 2`, avec 3 donateurs, 1 seul vote suffirait ($1 \ge 1$), ce qui ne représente que 33 % !
   - En multipliant par 2 des deux côtés, on évite toute division :
     - Pour 3 donateurs : $1 \times 2 = 2 < 3$ ❌ (refusé), $2 \times 2 = 4 \ge 3$ ✅ (accepté à 66 %).
2. **`r.executed = true` (Le pattern Checks-Effects-Interactions) :**
   - L'état interne du contrat est mis à jour **AVANT** le transfert d'ETH.
   - Si le destinataire était un contrat malveillant tentant de rappeler la fonction, `r.executed` étant déjà à `true`, l'attaque échouerait immédiatement.
3. **`r.recipient.call{value: r.amount}("")` :**
   - Méthode recommandée par Solidity pour transférer de l'ETH (remplace l'ancien `.transfer()` qui avait une limite rigide de 2300 gas).
   - On vérifie le retour booléen `require(ok, "Echec du virement")`.

---

### Étape 2.12 : Remboursement des Donateurs (F6, RG5)

```solidity
function refund() external {
    require(getStatus() == State.Failed, "Remboursement impossible");
    uint256 amount = contributions[msg.sender];
    require(amount > 0, "Rien a rembourser"); // RG5
    contributions[msg.sender] = 0;            // EFFET avant INTERACTION (anti-réentrance)
    (bool ok, ) = payable(msg.sender).call{value: amount}("");
    require(ok, "Echec du remboursement");
    emit Refunded(msg.sender, amount);
}
```

#### Décryptage pas à pas :
1. **Condition d'échec obligatoire :** Le remboursement n'est ouvert **que si la campagne a échoué** (`State.Failed`). Impossible de se faire rembourser si la campagne est en cours ou réussie.
2. **Calcul du dû :** On extrait la somme exacte que `msg.sender` a versée.
3. **Vérification `amount > 0` :** Protège contre les adresses n'ayant rien versé ou ayant déjà été remboursées.
4. **Remise à zéro immédiate (`contributions[msg.sender] = 0`) :**
   - C'est le cœur de la sécurité anti-réentrance.
   - Si l'attaquant tente de réexécuter `refund()` pendant la réception des fonds, son solde est déjà à 0, et l'appel est rejeté avec `"Rien a rembourser"`.
5. **Virement de l'ETH :** L'argent est renvoyé directement à l'adresse du donateur.

---

## 3. Synthèse des Garanties de Sécurité

| Menace potentielle | Solution implémentée dans le code |
|---|---|
| Modification des règles par le créateur | Variables `immutable` (`goal`, `deadline`, `minContribution`). |
| Retrait des fonds sans accord | Condition stricte `r.approvals * 2 >= donors.length`. |
| Attaque par réentrance (*Reentrancy*) | Pattern *Checks-Effects-Interactions* : soldes et statuts mis à zéro **avant** l'appel `.call{value: ...}`. |
| Double vote d'un donateur | Mapping booléen `hasVoted[id][msg.sender]`. |
| Vol des dons par un étranger | Remboursement limité strictement à `contributions[msg.sender]`. |
| Envoi direct d'ETH imprévu | Aucune fonction `receive()` ou `fallback()` : les transferts non sollicités sont rejetés par l'EVM. |

