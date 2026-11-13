# Phase 1 — Smart contracts et sécurité

**Responsable :** Étudiant 1 · **État :** ✅ terminée

Ce document explique ce qui a été réalisé dans la Phase 1, comment c'est construit et pourquoi. Il sert de référence au reste de l'équipe et de base pour le chapitre « Smart contracts et sécurité » du rapport.

---

## Sommaire

1. [Objectif et livrables](#1-objectif-et-livrables)
2. [Fichiers de la phase](#2-fichiers-de-la-phase)
3. [Choix de conception](#3-choix-de-conception)
4. [Contrat Crowdfunding.sol — la fabrique](#4-contrat-crowdfundingsol--la-fabrique)
5. [Contrat Project.sol — la campagne](#5-contrat-projectsol--la-campagne)
6. [Sécurité](#6-sécurité)
7. [Tests](#7-tests)
8. [Déploiement et scripts](#8-déploiement-et-scripts)
9. [Vérifier la phase en 5 minutes](#9-vérifier-la-phase-en-5-minutes)
10. [Correspondance avec le cahier des charges](#10-correspondance-avec-le-cahier-des-charges)
11. [Ce que la phase fournit aux autres étudiants](#11-ce-que-la-phase-fournit-aux-autres-étudiants)

---

## 1. Objectif et livrables

**Objectif :** écrire les smart contracts qui remplacent l'intermédiaire d'une plateforme de financement participatif. Le contrat garde les fonds, enregistre le créateur et les donateurs, fait respecter l'objectif et la date limite, organise le vote des retraits et rembourse en cas d'échec.

| Livrable | Résultat |
| --- | --- |
| Contrats `Crowdfunding.sol` et `Project.sol` | ✅ F1 à F6 et RG1 à RG5 implémentées |
| Sécurité (réentrance, contrôle d'accès, vote, double vote) | ✅ implémentée et testée |
| Tests unitaires Mocha/Chai | ✅ 47 tests réussis en fin de phase 1 (82 aujourd'hui), couverture 100 % (lignes et branches) |
| Déploiement Hardhat Ignition | ✅ `ignition/modules/Crowdfunding.js` |
| Outils pour la démo et le frontend | ✅ `simulate`, `ff`, `sync` |

---

## 2. Fichiers de la phase

| Fichier | Rôle |
| --- | --- |
| `contracts/Crowdfunding.sol` | Fabrique : crée les campagnes et garde leur liste |
| `contracts/Project.sol` | Une campagne : fonds, donateurs, votes, retraits, remboursements |
| `contracts/test/ReentrancyAttacker.sol` | Contrat malveillant utilisé seulement dans les tests (attaque par réentrance) |
| `contracts/test/RejectingReceiver.sol` | Contrat qui refuse l'ETH, utilisé seulement dans les tests (virement qui échoue) |
| `test/Crowdfunding.js` | 5 tests de la fabrique |
| `test/Project.js` | 42 tests de la campagne |
| `ignition/modules/Crowdfunding.js` | Module de déploiement Ignition |
| `scripts/simulate.js` | Rejoue les scénarios A (succès) et B (échec) sur le node local |
| `scripts/fastForward.js` | Avance l'horloge de la blockchain locale |
| `scripts/syncAbi.js` | Copie l'ABI et l'adresse déployée dans `frontend/src/` |
| `hardhat.config.js` | Solidity 0.8.24, réseau `localhost` (chaîne 31338) |
| `.solcover.js` | Exclut les contrats de test du calcul de couverture |

---

## 3. Choix de conception

Ces décisions ont été prises avant d'écrire le code. Chacune répond à un problème précis.

### 3.1 Deux contrats : une fabrique et une campagne

La plateforme doit gérer **plusieurs campagnes**. Il y avait deux options :

| Option | Problème |
| --- | --- |
| Un seul contrat qui contient toutes les campagnes dans des tableaux | Tous les fonds sont mélangés dans le même contrat. Un bug touche toutes les campagnes, et le code devient difficile à lire |
| **Une fabrique qui déploie un contrat par campagne** ✅ | Chaque campagne a son propre solde et ses propres règles. Elles sont isolées les unes des autres |

On a choisi le patron **Factory**. `Crowdfunding.sol` ne touche jamais à l'argent : il crée des `Project` et retient leurs adresses. Chaque `Project` sert de coffre-fort pour une seule campagne.

### 3.2 L'état de la campagne est calculé, pas stocké

Le cahier des charges cite un champ `state`. Si on le stockait, il faudrait qu'une transaction vienne le mettre à jour quand la date limite passe. Tant que personne ne l'envoie, la campagne afficherait « En cours » alors qu'elle est terminée.

On utilise donc une fonction `getStatus()` qui **calcule** l'état à chaque lecture, à partir de l'heure actuelle et du total collecté. L'état est toujours exact et ne coûte aucun gas.

### 3.3 Le créateur saisit une durée, pas une date

Le créateur donne une durée en secondes (l'interface la convertit depuis des minutes). Le contrat calcule `deadline = heure de création + durée`. Comme la durée doit être supérieure à 0, la date limite est **forcément dans le futur** (RG1), sans problème de fuseau horaire ni de date mal saisie.

### 3.4 Les règles sont figées

`creator`, `goal`, `minContribution` et `deadline` sont déclarés `immutable` : ils sont écrits une fois dans le constructeur et ne peuvent plus jamais changer. Le créateur ne peut donc pas baisser l'objectif ou repousser la date pendant la collecte. C'est l'objectif de transparence du cahier des charges.

### 3.5 Une voix par donateur

Le vote compte **une voix par adresse**, quel que soit le montant donné. Le cahier des charges parle de « 50 % des donateurs », pas de 50 % des fonds. Le seuil est inclusif : 2 votes sur 4 suffisent.

---

## 4. Contrat `Crowdfunding.sol` — la fabrique

### Données

| Variable | Type | Rôle |
| --- | --- | --- |
| `projects` | `Project[]` | Adresses de toutes les campagnes créées |

### Fonctions

| Fonction | Qui | Ce qu'elle fait |
| --- | --- | --- |
| `createProject(title, description, goal, minContribution, duration)` | Tout le monde | Déploie un nouveau `Project`, l'ajoute à la liste, émet `ProjectCreated` et renvoie son adresse |
| `getProjects()` | Lecture | Renvoie toutes les adresses de campagnes. L'interface l'appelle au chargement de la page d'accueil |
| `getProjectsCount()` | Lecture | Renvoie le nombre de campagnes |

### Point important : qui est le créateur ?

```solidity
Project p = new Project(msg.sender, title, description, goal, minContribution, duration);
```

C'est la fabrique qui déploie le `Project`. Si `Project` utilisait son propre `msg.sender` comme créateur, le créateur serait **l'adresse de la fabrique**, et personne ne pourrait jamais retirer les fonds. La fabrique transmet donc explicitement `msg.sender`, c'est-à-dire l'utilisateur qui a signé la transaction dans MetaMask. Un test vérifie ce comportement.

### Événement

`ProjectCreated(project, creator, title, goal, deadline)` : permet à l'interface d'afficher une nouvelle campagne sans recharger la page.

---

## 5. Contrat `Project.sol` — la campagne

### 5.1 Données stockées

C'est ici que sont stockés **le créateur et les donateurs**, comme le demande le cahier des charges.

| Variable | Type | Modifiable ? | Rôle |
| --- | --- | --- | --- |
| `creator` | `address` | Non (`immutable`) | Créateur de la campagne |
| `goal` | `uint256` | Non (`immutable`) | Objectif en wei |
| `minContribution` | `uint256` | Non (`immutable`) | Don minimum en wei |
| `deadline` | `uint256` | Non (`immutable`) | Date limite (timestamp Unix) |
| `title`, `description` | `string` | Non (aucune fonction ne les modifie) | Textes affichés |
| `totalRaised` | `uint256` | Oui | Total collecté |
| `contributions` | `mapping(address => uint256)` | Oui | Montant donné par chaque adresse |
| `donors` | `address[]` | Oui (ajout seulement) | Liste des donateurs |
| `withdrawRequests` | `WithdrawRequest[]` | Oui | Demandes de retrait |
| `hasVoted` | `mapping(uint256 => mapping(address => bool))` | Oui | Qui a voté pour quelle demande |

**Pourquoi un mapping ET un tableau pour les donateurs ?**
- Le mapping `contributions` répond à la question « **combien** a donné cette adresse ? ». Il sert au remboursement.
- Le tableau `donors` répond à « **qui** a donné, et **combien** de donateurs y a-t-il ? ». Il sert au calcul des 50 % et à l'affichage.
- En Solidity, on ne peut pas parcourir un mapping ni connaître sa taille, d'où le tableau en plus.

Une demande de retrait (`WithdrawRequest`) contient : `amount` (montant), `reason` (motif), `recipient` (destinataire), `approvals` (nombre de votes pour) et `executed` (déjà payée ou non).

### 5.2 Les trois états

| Valeur | État | Condition |
| --- | --- | --- |
| `0` | En cours (`Ongoing`) | La date limite n'est pas atteinte |
| `1` | Échouée (`Failed`) | Date limite passée **et** total < objectif |
| `2` | Réussie (`Successful`) | Date limite passée **et** total ≥ objectif |

Une campagne qui atteint son objectif **avant** la date limite reste « En cours » : on peut encore donner jusqu'à la fin.

### 5.3 Les fonctions, une par une

Chaque fonction suit le même schéma : **vérifier** les conditions (`require`), **modifier** l'état du contrat, puis **envoyer** l'ETH s'il y en a à envoyer. Si une condition échoue, toute la transaction est annulée et le message d'erreur est renvoyé à l'interface.

#### Constructeur — création de la campagne (F1, RG1)

| | |
| --- | --- |
| **Appelé par** | La fabrique, lors de `createProject()` |
| **Vérifie** | Créateur ≠ adresse nulle · objectif > 0 · don minimum > 0 · durée > 0 |
| **Effet** | Enregistre les paramètres, calcule `deadline = maintenant + durée` |
| **Erreurs** | `Createur invalide`, `Objectif invalide`, `Don minimum invalide`, `Duree invalide` |

#### `contribute()` — donner (F2, RG2)

| | |
| --- | --- |
| **Appelé par** | N'importe qui, avec de l'ETH (`payable`) |
| **Vérifie** | Date limite non atteinte · montant ≥ don minimum |
| **Effet** | Si c'est le premier don de cette adresse, l'ajoute à `donors`. Ajoute le montant à `contributions[adresse]` et à `totalRaised` |
| **Événement** | `DonationReceived(donateur, montant)` |
| **Erreurs** | `Campagne terminee`, `Don trop faible` |

Le contrat n'a pas de fonction `receive()` : un envoi d'ETH direct, sans passer par `contribute()`, est refusé. Tous les dons respectent donc les règles.

#### `getStatus()`, `timeLeft()`, `getDonors()`, `getWithdrawRequestsCount()` — consulter (F3)

Fonctions de lecture, gratuites, utilisables sans wallet :
- `getStatus()` renvoie 0, 1 ou 2 (voir 5.2) ;
- `timeLeft()` renvoie les secondes restantes, ou 0 si la campagne est terminée ;
- `getDonors()` renvoie la liste des donateurs ;
- `getWithdrawRequestsCount()` renvoie le nombre de demandes, pour que l'interface puisse les parcourir avec `withdrawRequests(i)`.

Les variables `public` (`goal`, `totalRaised`, `contributions(adresse)`, `hasVoted(id, adresse)`…) sont aussi lisibles directement.

#### `createWithdrawRequest(amount, reason, recipient)` — demander un retrait (F4)

| | |
| --- | --- |
| **Appelé par** | Le créateur uniquement |
| **Vérifie** | Campagne réussie · destinataire ≠ adresse nulle · 0 < montant ≤ solde du contrat |
| **Effet** | Ajoute une demande avec 0 vote, non exécutée. Son identifiant est sa position dans la liste (0, 1, 2…) |
| **Événement** | `WithdrawRequestCreated(id, montant, destinataire, motif)` |
| **Erreurs** | `Createur uniquement`, `Campagne non reussie`, `Destinataire invalide`, `Montant invalide` |

Le créateur indique un **destinataire** (par exemple un fournisseur) : l'argent ne va pas forcément sur son propre compte, et les donateurs voient où il part avant de voter.

#### `voteWithdrawRequest(id)` — voter (F5)

| | |
| --- | --- |
| **Appelé par** | Un donateur uniquement (`contributions[adresse] > 0`) |
| **Vérifie** | La demande existe · l'appelant est donateur · la demande n'est pas déjà exécutée · l'appelant n'a pas déjà voté pour cette demande |
| **Effet** | Marque l'appelant comme ayant voté, ajoute 1 à `approvals` |
| **Événement** | `WithdrawVote(id, votant)` |
| **Erreurs** | `Demande inexistante`, `Pas donateur`, `Deja execute`, `Deja vote` |

Il n'y a que des votes « pour ». Ne pas voter revient à refuser.

#### `withdrawRequestedAmount(id)` — retirer (F5, RG4)

| | |
| --- | --- |
| **Appelé par** | Le créateur uniquement |
| **Vérifie** | La demande existe · elle n'est pas déjà exécutée · au moins 50 % des donateurs ont voté pour · le solde est suffisant |
| **Effet** | Marque la demande comme exécutée, **puis** envoie l'ETH au destinataire |
| **Événement** | `FundsWithdrawn(id, montant, destinataire)` |
| **Erreurs** | `Createur uniquement`, `Demande inexistante`, `Deja execute`, `Moins de 50% d'approbation`, `Solde insuffisant`, `Echec du virement` |

**Le calcul des 50 % :**

```solidity
require(r.approvals * 2 >= donors.length, "Moins de 50% d'approbation");
```

En Solidity, la division entière arrondit vers le bas. Écrire `approvals >= donors.length / 2` donnerait, avec 3 donateurs, `3 / 2 = 1` : **un seul vote sur trois** suffirait (33 %). En multipliant par 2 au lieu de diviser, on obtient le bon résultat :

| Donateurs | Votes | Calcul | Résultat |
| --- | --- | --- | --- |
| 3 | 1 | 1 × 2 = 2 < 3 | ❌ refusé |
| 3 | 2 | 2 × 2 = 4 ≥ 3 | ✅ accepté |
| 4 | 2 | 2 × 2 = 4 ≥ 4 | ✅ accepté (seuil inclusif) |

**Le contrôle du solde** est refait au moment du retrait. Le créateur peut avoir plusieurs demandes ouvertes, et chacune est valide séparément, mais leur total peut dépasser ce qui reste. La deuxième demande payée échoue alors avec `Solde insuffisant`.

#### `refund()` — se faire rembourser (F6, RG5)

| | |
| --- | --- |
| **Appelé par** | Un donateur |
| **Vérifie** | Campagne échouée · l'appelant a une contribution > 0 |
| **Effet** | Remet sa contribution à 0, **puis** lui renvoie exactement ce montant |
| **Événement** | `Refunded(donateur, montant)` |
| **Erreurs** | `Remboursement impossible`, `Rien a rembourser`, `Echec du remboursement` |

Chaque donateur récupère **uniquement sa propre contribution**, et **une seule fois** : au deuxième appel, sa contribution vaut 0 et l'appel est refusé.

### 5.4 Pourquoi les fonds sont bloqués jusqu'à la date limite (RG3)

Il n'existe que deux façons de faire sortir de l'ETH d'un `Project` : `withdrawRequestedAmount()` et `refund()`. La première exige l'état « Réussie », la seconde l'état « Échouée ». Ces deux états n'existent **qu'après la date limite**. Pendant la collecte, aucun chemin ne permet donc de sortir l'argent, pas même pour le créateur.

---

## 6. Sécurité

| Menace | Exemple | Protection dans le code | Test |
| --- | --- | --- | --- |
| **Réentrance** | Un contrat malveillant rappelle `refund()` pendant qu'il reçoit son remboursement, pour être payé deux fois | Ordre *Checks → Effects → Interactions* : la contribution est remise à 0 (et la demande marquée `executed`) **avant** l'envoi de l'ETH. Le second appel trouve 0 et échoue | `ReentrancyAttacker.sol` : l'attaque est tentée et échoue |
| **Retrait non autorisé** | Un donateur ou un inconnu appelle le retrait | Modificateur `onlyCreator` (`msg.sender == creator`) | Retrait et demande par un non-créateur refusés |
| **Dépense abusive** | Le créateur vide la caisse sans accord | Vote obligatoire d'au moins 50 % des donateurs | 1 vote sur 3 refusé, 2 sur 3 accepté |
| **Double vote** | Un donateur vote deux fois pour atteindre le seuil | Mapping `hasVoted[id][adresse]` | Second vote refusé |
| **Double paiement** | Une demande déjà payée est exécutée à nouveau | Champ `executed` | Second retrait refusé |
| **Virement qui échoue** | Le destinataire est un contrat qui refuse l'ETH | `require(ok)` : la transaction entière est annulée, la contribution ou la demande reste intacte | `RejectingReceiver.sol` |
| **Changement des règles** | Le créateur baisse l'objectif après coup | Variables `immutable` | Aucune fonction ne permet de les modifier |
| **Débordement d'entiers** | Un total qui dépasse la capacité d'un nombre | Solidity 0.8 vérifie automatiquement les débordements | — |

---

## 7. Tests

`npm test` lance aujourd'hui **82 tests**, tous réussis : les 47 de la phase 1, détaillés ci-dessous, et 35 tests ajoutés ensuite (fabrique, valeurs limites, invariants, cycle de vie complet). `npm run coverage` donne **100 %** de couverture des lignes et des branches sur les deux contrats.

| Groupe | Nombre | Ce qui est vérifié |
| --- | --- | --- |
| Fabrique | 5 | Liste vide au départ, création et événement, **le créateur est l'appelant et non la fabrique**, plusieurs créateurs, refus de paramètres invalides |
| Déploiement (RG1) | 5 | Paramètres enregistrés, refus d'un objectif, d'un minimum ou d'une durée nuls, refus d'un créateur nul |
| Dons (F2, RG2) | 5 | Don accepté et événement, pas de doublon dans `donors`, refus sous le minimum, refus après la date limite, refus d'un envoi direct |
| États et temps (F3, RG3) | 4 | Réussie, échouée, reste en cours même si l'objectif est atteint avant la fin, `timeLeft` décroît puis vaut 0 |
| Demande de retrait (F4) | 6 | Refus si non réussie, avant la date limite, par un non-créateur, montant > solde, destinataire nul ; création et événement |
| Vote et retrait (F5, RG4) | 12 | Vote et événement, refus d'un non-donateur, double vote, demande inexistante, 1/3 refusé, 2/3 accepté, événement, second retrait refusé, vote après exécution refusé, retrait par un non-créateur, cumul de demandes au-delà du solde |
| Remboursement (F6, RG5) | 7 | Montant exact, événement, second remboursement refusé, non-donateur refusé, refus si réussie, refus avant la fin, contrat vidé quand tout le monde est remboursé |
| Sécurité | 3 | Attaque par réentrance bloquée, remboursement annulé si le donateur refuse l'ETH, retrait annulé si le destinataire refuse l'ETH |

Les tests utilisent `time.increase()` de Hardhat pour **avancer le temps** et simuler la fin d'une campagne sans attendre.

---

## 8. Déploiement et scripts

### Déploiement avec Hardhat Ignition

`ignition/modules/Crowdfunding.js` déploie **uniquement la fabrique**. Les campagnes ne sont pas déployées à l'avance : elles sont créées ensuite depuis l'interface, avec `createProject()`. Ignition retient l'adresse déployée dans `ignition/deployments/chain-31338/`, ce qui rend le déploiement reproductible.

Sur un node local neuf, la fabrique est toujours déployée à la même adresse : `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

### Scripts

| Commande | Rôle |
| --- | --- |
| `npm run deploy` | Déploie la fabrique sur le node local |
| `npm run deploy:reset` | Redéploie à zéro après un redémarrage du node |
| `npm run sync` | Copie l'ABI des deux contrats dans `frontend/src/abi/` et l'adresse dans `frontend/src/deployed.json` |
| `npm run simulate` | Joue les scénarios A et B complets dans le terminal. Chaque `[REFUSE]` affiché est un refus **attendu** |
| `SECONDS=120 npm run ff` | Avance l'horloge de 120 secondes, pour terminer une campagne pendant la démo |

---

## 9. Vérifier la phase en 5 minutes

```bash
npm install
npm test              # attendu : 82 passing
npm run coverage      # attendu : 100 % sur Crowdfunding.sol et Project.sol
```

Puis, avec deux terminaux :

```bash
# Terminal 1 (laisser ouvert)
npm run node

# Terminal 2
npm run deploy        # attendu : adresse 0x5FbDB2315678afecb367f032d93F642f64180aa3
npm run simulate      # attendu : scénario A réussi (+4 ETH au destinataire), scénario B remboursé (contrat à 0)
npm run sync          # attendu : « ABI Crowdfunding copiée », « ABI Project copiée »
```

---

## 10. Correspondance avec le cahier des charges

| Exigence | Implémentation |
| --- | --- |
| F1 Créer une campagne | `Crowdfunding.createProject()` + constructeur de `Project` |
| F2 Donner | `contribute()` |
| F3 Consulter | `getStatus()`, `timeLeft()`, `getDonors()`, variables publiques |
| F4 Demander un retrait | `createWithdrawRequest()` |
| F5 Voter et retirer | `voteWithdrawRequest()`, `withdrawRequestedAmount()` |
| F6 Se faire rembourser | `refund()` |
| RG1 Paramètres positifs, date dans le futur | `require` du constructeur |
| RG2 Pas de don après la date ni sous le minimum | `require` de `contribute()` |
| RG3 Fonds bloqués jusqu'à la date limite | Aucune sortie possible pendant l'état « En cours » (voir 5.4) |
| RG4 Retrait si au moins 50 % des donateurs approuvent | `approvals * 2 >= donors.length` |
| RG5 Chaque donateur récupère sa contribution, une fois | Contribution remise à 0 avant l'envoi |
| Créateur et donateurs stockés dans le contrat | `creator`, `contributions`, `donors` |
| Fonctions et événements du cahier | Tous présents avec exactement les mêmes noms |

**Écarts volontaires, à expliquer dans le rapport :**
- l'état n'est pas stocké dans une variable `state` mais calculé par `getStatus()` (voir 3.2) ;
- le créateur saisit une durée, la date limite est calculée (voir 3.3) ;
- ajouts par rapport au cahier : la fabrique `Crowdfunding.sol`, `getWithdrawRequestsCount()` et `hasVoted()`, nécessaires à l'interface.

---

## 11. Ce que la phase fournit aux autres étudiants

| Pour | Ce qui est prêt |
| --- | --- |
| **Étudiant 2** (tests et déploiement) | Les tests à relire et compléter, le module Ignition, `simulate` comme modèle pour écrire `seedDemo.js` |
| **Étudiant 4** (recette et démo) | Les messages d'erreur attendus pour chaque refus (section 5.3) et `npm run simulate`, qui montre le résultat attendu des scénarios A et B |
| **Étudiant 3** (interface web) | L'ABI et l'adresse dans `frontend/src/`, la liste des fonctions et des événements (section 5), la liste des messages d'erreur à traduire pour l'utilisateur (tableaux « Erreurs » de la section 5.3) · les règles d'affichage des boutons : **Donner** si en cours · **Demander un retrait** si créateur et réussie · **Voter** si donateur, pas encore voté et demande non exécutée · **Retirer** si créateur et ≥ 50 % · **Rembourser** si donateur et échouée |

**L'ABI est gelée** : les noms de fonctions, de paramètres et d'événements ne changeront plus.
