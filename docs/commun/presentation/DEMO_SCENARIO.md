# Déroulé de la démonstration (~15 minutes)

> Objectif : montrer le cycle complet d'une campagne — création, dons, vote, retrait — puis l'échec et le remboursement.
> Répéter deux fois avant la soutenance et enregistrer une vidéo de secours.

## Avant de commencer (10 minutes avant)

- [ ] `npm run node` lancé, terminal visible mais propre.
- [ ] `npm run deploy` puis `npm run sync` puis `npm run seed` exécutés.
- [ ] `cd frontend && npm run dev` lancé, page d'accueil ouverte.
- [ ] MetaMask : réseau `Hardhat Local` (31337), comptes Créateur / D1 / D2 / D3 importés.
- [ ] **Effacer les données d'activité** dans MetaMask si le nœud a redémarré.
- [ ] Onglets préparés : application, terminal, slides.
- [ ] Vidéo de secours accessible hors ligne.
- [ ] Navigateur sans MetaMask prêt pour le scénario F (optionnel).

## Découpage (15 min)

| Temps | Séquence | Qui |
| --- | --- | --- |
| 0:00–3:00 | Problème, objectifs, architecture | Étudiant 4 |
| 3:00–6:00 | Smart contracts et sécurité | Étudiant 1 |
| 6:00–8:00 | Tests en direct et déploiement | Étudiant 2 |
| 8:00–12:00 | Démo A : succès, vote, retrait | Étudiant 3 |
| 12:00–14:00 | Démo B : échec, remboursement | Étudiant 4 |
| 14:00–15:00 | Conclusion et questions | Tous |

## Démo A — campagne réussie (4 min)

1. **Créer** (compte Créateur) : « Atelier vélo solidaire », objectif `5` ETH, minimum `0.1` ETH, durée `2` minutes.
   - Phrase : « La campagne est un contrat autonome ; l'objectif et la date limite sont immuables. »
2. **D1 donne 2 ETH**, **D2 donne 2 ETH**, **D3 donne 2 ETH**.
   - Montrer la progression et la liste des donateurs.
3. Avancer le temps : `SECONDS=120 npm run ff`.
   - Montrer le badge « Réussie » sans transaction de clôture : l'état est calculé.
4. **Créateur** crée une demande de `4` ETH, motif « Achat du matériel ».
5. **D1 vote**, puis **D2 vote**.
   - Phrase : « Une voix par donateur ; il faut au moins 50 % des donateurs. »
6. **Créateur** retire.
   - Montrer le solde du contrat (2 ETH restants) et le statut « Exécutée ».
7. Tenter un second retrait : refus « Deja execute ».

## Démo B — campagne échouée (2 min)

1. **Créateur** crée « Serre connectée », objectif `50` ETH, minimum `0.5` ETH, durée `2` minutes.
2. **D1 donne 1 ETH**, **D2 donne 2 ETH**.
3. Avancer le temps : `SECONDS=120 npm run ff`.
   - Badge « Échouée ».
4. **D1 rembourse**, puis **D2 rembourse**.
   - Montrer le solde du contrat à 0 ETH et le double remboursement refusé.

## Scénario F — sans MetaMask (30 s, optionnel)

Ouvrir l'application dans un profil sans extension : la lecture fonctionne, les boutons d'écriture sont masqués, un message explique que MetaMask est requis.

## Points à dire

- L'état n'est pas stocké : `getStatus()` le calcule à partir de l'horloge et du total.
- Les fonds ne passent jamais par le créateur avant le vote.
- Le retrait est protégé contre la réentrance (état mis à jour avant le virement).
- Le remboursement est possible uniquement si la campagne a échoué.
- Les messages d'erreur sont traduits côté interface.

## Plan B

| Problème | Réaction |
| --- | --- |
| MetaMask bloqué (« nonce too high ») | Effacer les données d'activité, recharger |
| Transaction en attente | Attendre 5 s, sinon annuler et rejouer |
| Nœud planté | Relancer `npm run node`, redéployer, reseeder, recharger |
| Réseau incorrect | MetaMask → passer sur Hardhat Local (31337) |
| Application indisponible | Lancer la vidéo de secours |
| Question technique | Répondre court, proposer d'y revenir après la démo |

## Après la démo

- [ ] Ne pas fermer le terminal avant les questions.
- [ ] Noter les questions posées pour le rapport.
- [ ] Sauvegarder les captures d'écran utilisées.
