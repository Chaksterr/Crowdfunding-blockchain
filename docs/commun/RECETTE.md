# Recette fonctionnelle — scénarios A à F

> Document de validation manuelle. À exécuter après `npm run deploy` et `npm run seed`, avec quatre comptes Hardhat importés dans MetaMask.
> Comptes : **Créateur** = compte #0, **D1** = #1, **D2** = #2, **D3** = #3. Tous ont 10 000 ETH de test.
> Après chaque redémarrage de `npm run node` : MetaMask → Paramètres → Avancé → **Effacer les données d'activité**.

## Préparation

```bash
# Terminal 1
npm run node

# Terminal 2
npm run deploy
npm run sync
npm run seed
cd frontend && npm run dev
```

- Réseau MetaMask : `Hardhat Local`, RPC `http://127.0.0.1:8545`, chainId `31337`, symbole `ETH`.
- Vérifier que l'adresse de la fabrique affichée est `0x5FbDB2315678afecb367f032d93F642f64180aa3`.
- Pour accélérer le temps entre deux étapes : `SECONDS=120 npm run ff` (à la racine, nœud actif).

## Scénario A — Campagne réussie, vote et retrait

| Étape | Compte | Action | Résultat attendu |
| --- | --- | --- | --- |
| 1 | Créateur | Accueil → « Créer une campagne » : titre `Test A`, objectif `5`, don minimum `0.1`, durée `2` minutes | Transaction confirmée, redirection vers le détail, badge « En cours » |
| 2 | D1 | Donner `2` ETH | Total 2 ETH, progression 40 %, donateur ajouté |
| 3 | D2 | Donner `2` ETH | Total 4 ETH, progression 80 % |
| 4 | D3 | Donner `2` ETH | Total 6 ETH, progression 100 %, badge encore « En cours » |
| 5 | — | Attendre la fin ou `SECONDS=120 npm run ff` | Badge « Réussie » |
| 6 | Créateur | Demande de retrait : montant `4`, motif `Achat du matériel`, destinataire = adresse du créateur | Demande #0 créée, 0 vote |
| 7 | D1 | Voter pour la demande #0 | 1 vote |
| 8 | D2 | Voter pour la demande #0 | 2 votes ; bouton « Retirer » actif pour le créateur |
| 9 | Créateur | Retirer la demande #0 | Transaction confirmée, demande « Exécutée », solde du contrat 2 ETH |
| 10 | Tous | Recharger la page | Total 6 ETH, 3 donateurs, historique cohérent |

**Critère :** le destinataire reçoit exactement 4 ETH ; le contrat conserve 2 ETH ; un second retrait de la même demande est refusé.

## Scénario B — Campagne échouée et remboursements

| Étape | Compte | Action | Résultat attendu |
| --- | --- | --- | --- |
| 1 | Créateur | Créer `Test B` : objectif `50`, minimum `0.5`, durée `2` minutes | Campagne « En cours » |
| 2 | D1 | Donner `1` ETH | Total 1 ETH |
| 3 | D2 | Donner `2` ETH | Total 3 ETH |
| 4 | — | Attendre la fin ou `SECONDS=120 npm run ff` | Badge « Échouée » |
| 5 | D1 | Cliquer « Rembourser » | D1 reçoit 1 ETH (moins le gaz), bouton désactivé ensuite |
| 6 | D2 | Cliquer « Rembourser » | D2 reçoit 2 ETH, contrat à 0 ETH |
| 7 | D3 | Ouvrir la campagne | Aucun bouton de remboursement (non-donateur) |

**Critère :** chaque donateur récupère exactement sa contribution ; le solde du contrat finit à 0 ; un second remboursement est refusé.

## Scénario C — Refus de don

| Cas | Action | Message attendu |
| --- | --- | --- |
| C1 | Donner `0.05` ETH sur une campagne dont le minimum est `0.1` | « Don trop faible » (ou message français équivalent) |
| C2 | Ouvrir une campagne terminée | Le formulaire de don est masqué ou désactivé |
| C3 | Forcer un don après la deadline (console ou transaction directe) | « Campagne terminee » |

**Critère :** aucun total ne change après un refus ; le message est lisible, pas une erreur brute.

## Scénario D — Quorum insuffisant

| Étape | Compte | Action | Résultat attendu |
| --- | --- | --- | --- |
| 1 | Créateur | Sur une campagne réussie avec 3 donateurs, créer une demande | Demande visible |
| 2 | D1 | Voter | 1 vote sur 3 |
| 3 | Créateur | Tenter « Retirer » | Refus « Moins de 50% d'approbation » |
| 4 | D2 | Voter | 2 votes sur 3 |
| 5 | Créateur | Retirer | Accepté |

**Critère :** le bouton de retrait reste désactivé ou l'erreur est affichée tant que le quorum n'est pas atteint.

## Scénario E — Double action et accès refusé

| Cas | Action | Message attendu |
| --- | --- | --- |
| E1 | D1 vote deux fois sur la même demande | « Deja vote » |
| E2 | D1 rembourse deux fois | « Rien a rembourser » |
| E3 | D2 (non-créateur) tente de créer une demande | Formulaire absent ; en direct : « Createur uniquement » |
| E4 | D2 tente de retirer une demande | Bouton absent ; en direct : « Createur uniquement » |
| E5 | Voter sur une demande inexistante | « Demande inexistante » |

## Scénario F — Navigateur sans MetaMask

1. Ouvrir l'application dans un navigateur ou un profil sans extension MetaMask.
2. Vérifier que la page d'accueil et le détail des campagnes s'affichent (lecture via RPC).
3. Le bouton « Connecter MetaMask » explique que l'extension est requise.
4. Les boutons d'écriture (donner, créer, voter, retirer, rembourser) sont absents ou désactivés.
5. Aucune erreur JavaScript bloquante dans la console.

**Critère :** lecture complète, écriture impossible, message explicite.

## Test multi-PC

```bash
# PC 1 (serveur)
npx hardhat node --hostname 0.0.0.0
npm run deploy
npm run sync
npm run seed
cd frontend && npm run dev -- --host

# PC 2
# ouvrir http://<IP-du-PC1>:5173
# MetaMask : ajouter le réseau avec http://<IP-du-PC1>:8545, chainId 31337
```

Vérifier depuis le PC 2 : lecture des campagnes, connexion MetaMask, un don signé, et la mise à jour de la liste.

## Checklist de sortie

- [ ] A : retrait de 4 ETH après 2 votes sur 3
- [ ] B : remboursements complets, contrat à 0
- [ ] C : don sous le minimum et après deadline refusés avec un message clair
- [ ] D : retrait refusé avec 1 vote sur 3
- [ ] E : double vote, double remboursement et accès non-créateur refusés
- [ ] F : lecture sans MetaMask, écriture masquée
- [ ] Multi-PC : lecture et écriture depuis un second poste
- [ ] Captures d'écran desktop et mobile pour le rapport
