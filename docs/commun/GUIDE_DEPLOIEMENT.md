# Guide de déploiement local

Ce guide décrit comment lancer la plateforme de financement participatif **de zéro sur un ordinateur**, puis comment rejouer la démo avec les données de test. Il complète le [README](../../README.md) (sections 0 et 7) et le [guide MetaMask & Hardhat](GUIDE_METAMASK_HARDHAT.md).

> Toutes les commandes se lancent depuis la **racine du projet** (`plateforme-crowdfunding-blockchain/`), sauf mention contraire.

---

## 1. Prérequis

- **Git**
- **Node.js 18 ou plus** (LTS) et `npm`
- **MetaMask** installé dans le navigateur (extension)
- Deux terminaux ouverts dans le dossier du projet

---

## 2. Installation

```bash
git clone https://github.com/Chaksterr/plateforme-crowdfunding-blockchain.git
cd plateforme-crowdfunding-blockchain

npm install          # dépendances Hardhat / Ignition / ethers
npm test             # contrôle : doit afficher 47 passing
```

> Si `npm test` ne passe pas, arrêtez-vous ici : l'environnement n'est pas prêt.

---

## 3. Démarrage de la blockchain locale (terminal 1)

```bash
npm run node
```

- RPC : `http://127.0.0.1:8545`
- Chain ID : `31337`
- 20 comptes de test pré-financés à 10 000 ETH, avec leurs clés privées affichées.

**Laissez ce terminal ouvert** pendant toute la session. Sa fermeture arrête la blockchain et efface son état.

---

## 4. Déploiement et synchronisation (terminal 2)

```bash
npm run deploy       # déploie la fabrique Crowdfunding (Ignition)
npm run sync         # copie l'ABI et l'adresse dans frontend/src/
```

Adresse attendue de la fabrique sur un nœud neuf :

```
0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Elle est aussi écrite dans `ignition/deployments/chain-31337/deployed_addresses.json` puis recopiée dans `frontend/src/deployed.json`.

---

## 5. Données de démo

```bash
npm run seed
```

Crée 3 campagnes et des dons pour que l'interface ait du contenu :

| Campagne | Objectif | Don minimum | Durée | Résultat après le seed |
| --- | --- | --- | --- | --- |
| A · Atelier vélo solidaire | 5 ETH | 0.1 ETH | 1800 s | **En cours** (0), 0.5 ETH collecté |
| B · Album photo des étudiants | 5 ETH | 0.5 ETH | 600 s | **Réussie** (2), 5 ETH collecté |
| C · Serre connectée du campus | 50 ETH | 0.5 ETH | 600 s | **Échouée** (1), 3 ETH collecté |

Le script avance l'horloge de 700 s pour clore B et C, puis vérifie les trois statuts. Il s'arrête avec un code non nul si un statut est inattendu. Il refuse aussi de s'exécuter si la fabrique contient déjà des campagnes.

**Repartir de zéro :**

```bash
npm run deploy:reset   # redéploie une fabrique vide (état neuf)
npm run seed           # recrée les données de démo
```

> Le seed nécessite un nœud neuf ou une fabrique vide. Sur un nœud redémarré, faites toujours `deploy:reset` avant `seed`.

---

## 6. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # facultatif : valeurs par défaut déjà correctes
npm run dev
```

L'application est servie par Vite (en général `http://localhost:5173`).

Variables d'environnement (`.env`) :

```bash
VITE_RPC_URL=http://127.0.0.1:8545
VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

- `VITE_RPC_URL` : lecture sans wallet.
- `VITE_FACTORY_ADDRESS` : facultatif, l'adresse est normalement lue depuis `frontend/src/deployed.json` généré par `npm run sync`.

---

## 7. Configuration MetaMask

1. **Réglages → Réseaux → Ajouter un réseau manuellement**
   - Nom : `Hardhat Local`
   - URL RPC : `http://127.0.0.1:8545`
   - ID de chaîne : `31337`
   - Symbole : `ETH`
2. **Importer les comptes de test** (Créateur, Donateurs 1/2/3) avec les clés privées affichées dans le terminal 1. Chacun reçoit 10 000 ETH.
3. **Après chaque redémarrage de `npm run node`** : MetaMask → **Paramètres → Avancé → Effacer les données d'activité**. Sinon les transactions restent bloquées avec l'erreur « nonce too high ».

Détails et clés des premiers comptes : [GUIDE_METAMASK_HARDHAT.md](GUIDE_METAMASK_HARDHAT.md), sections 2.1 à 2.3.

> ⚠️ Ces clés sont **publiques** et réservées au réseau local 31337. N'utilisez jamais un vrai portefeuille pour ce projet.

---

## 8. Mode multi-PC

Pour tester depuis un second ordinateur du même réseau :

```bash
# Sur le PC hôte — terminal 1 : écouter sur toutes les interfaces
npx hardhat node --hostname 0.0.0.0

# Sur le PC hôte — terminal 2
npm run deploy
npm run sync
npm run seed

# Frontend exposé sur le réseau
cd frontend
npm run dev -- --host
```

Sur le **second PC**, dans MetaMask, remplacez l'URL RPC `127.0.0.1` par l'**IP locale du PC hôte**, par exemple `http://192.168.1.42:8545` (même ID de chaîne `31337`). Ouvrez ensuite l'application via l'adresse réseau affichée par Vite (ex. `http://192.168.1.42:5173`).

---

## 9. Procédure de réinitialisation complète

À faire dès que l'état local est incohérent ou après un redémarrage du nœud :

```bash
# Terminal 1 : arrêter (Ctrl+C) puis relancer
npm run node

# Terminal 2
npm run deploy:reset
npm run sync
npm run seed
```

Puis dans MetaMask : **Effacer les données d'activité** pour chaque compte importé.

---

## 10. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `nonce too high` / transactions bloquées | MetaMask garde l'historique d'un ancien nœud | **Paramètres → Avancé → Effacer les données d'activité** |
| `HHE22` / « not a local Hardhat network » | La commande n'est pas lancée sur le réseau local | Vérifier `--network localhost` et que `npm run node` tourne |
| `npm run sync` : « Pas encore de déploiement » | Aucun déploiement Ignition dans `chain-31337` | Lancer `npm run deploy` (ou `npm run deploy:reset`) puis `npm run sync` |
| Le frontend ne trouve pas le contrat | Mauvaise adresse / mauvais réseau | Vérifier `frontend/src/deployed.json` et que MetaMask est sur la chaîne `31337` |
| `npm run seed` : « fabrique contient déjà … campagne(s) » | L'état n'est pas vide | `npm run deploy:reset` puis `npm run seed` |
| `ECONNREFUSED 127.0.0.1:8545` | Le nœud local n'est pas lancé | Démarrer `npm run node` (terminal 1) |
| Le solde MetaMask ne correspond pas | Compte importé sur un autre réseau | Basculer MetaMask sur `Hardhat Local` (31337) |

---

## 11. Récapitulatif des commandes

```bash
npm install            # une seule fois
npm test               # 47 tests
npm run node           # terminal 1 : blockchain locale
npm run deploy         # terminal 2 : déploie la fabrique
npm run deploy:reset   # redéploie après un redémarrage
npm run sync           # copie ABI + adresse dans frontend/src/
npm run seed           # 3 campagnes de démo (A en cours, B réussie, C échouée)
npm run simulate       # scénarios A et B sans interface
SECONDS=120 npm run ff # avance l'horloge de 120 s
```

Voir aussi : [README](../../README.md) sections 0 et 7, [GUIDE_METAMASK_HARDHAT.md](GUIDE_METAMASK_HARDHAT.md).
