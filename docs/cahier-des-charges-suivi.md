# Suivi du cahier des charges

Branche `feat/compagnon-lecture`. Légende :
- **Fait, testé** : implémenté et vérifié par un test automatique ou un parcours navigateur.
- **Fait** : implémenté et vérifié à la main ou par relecture, sans test automatique dédié.
- **Partiel** : une partie seulement est faite.
- **Manque** : non fait.
- **Bloqué** : dépend d'un accès ou d'une décision extérieure.

## 3. Navigation et design

| Exigence | État | Où / preuve |
|---|---|---|
| Trois espaces (bibliothèque, Découvrir, Mon univers) | Fait, testé | `app-shell.tsx`, parcours e2e |
| Bibliothèque : lecture en cours et prochaine action | Fait, testé | `reader-home.tsx`, e2e « la suite proposée est le tome 4 » |
| Tomes possédés, lus, manquants, souhaités distingués | Fait | cartes de séries (`library-home.tsx`), grille de tomes (légende textuelle) |
| Accès aux envies, bouton « Ajouter un manga » | Fait, testé | e2e « États vides » |
| Découvrir : suggestions expliquées, sélections, filtres, ajout | Fait, testé | e2e « Découvrir », `suggest.test.ts` |
| Mon univers : l'analyse seule (carte des goûts, lectures, dépenses, envies estimées à part) | Fait, testé | e2e « Carte des goûts », « Envies », « Rouage » |
| Réglages derrière le rouage de l'en-tête (`/reglages`) | Fait, testé | e2e « Rouage », « Déconnexion » |
| Mobile d'abord, utilisable sur ordinateur | Fait, testé | e2e en 390×844 et 1280×800 (navigateur, pas appareil réel) |
| Actions faciles à toucher (44 px) | Fait | tous les contrôles passés à `min-h-11` ou plus |
| Libellés simples, tutoiement | Fait | relecture (« vous » et jargon retirés) |
| Chargement, vide, erreur, réussite partout | Fait | `loading.tsx`, `not-found.tsx`, boundaries d'erreur, toasts `role=status/alert` |
| Clavier, contrastes | Fait, testé | Lighthouse accessibilité 100 (4 écrans), focus piégé dans les panneaux, radios natives |
| Pas de statistiques encombrantes sur l'accueil | Fait | bloc de compteurs retiré de l'accueil |
| Pas d'action factice | Fait | lien « mot de passe oublié » branché, lien sans effet retiré, scan non annoncé |

## 4. Recherche et ajout

| Exigence | État | Où / preuve |
|---|---|---|
| Rechercher une série (tolérant) | Fait, testé | `search_mangas`, e2e « spi famili », « recherche 0/1/2/plusieurs » |
| Reconnaître la série et son **édition** | Partiel | la série oui. Les éditions (`volumes.edition`) ne sont pas renseignées dans le catalogue, donc rien à proposer |
| « J'ai les tomes 1 à 12 », tomes individuels, « lu jusqu'au » | Fait, testé | parcours d'ajout, e2e |
| Persistance après rechargement | Fait, testé | e2e |
| Catalogue local d'abord, sources externes en complément, sans doublon | Fait, testé | `merge.test.ts` (y compris les autres noms) |
| Parcours ISBN qui renvoie une série existante | Fait, testé | `findSeriesForVolumeTitle`, `actions.test.ts`. Le scan n'est pas exposé |
| Pas de doublons de séries, éditions, tomes | Fait, testé | contraintes uniques, e2e double clic, fusion contrôlée des doublons existants |
| Ne jamais écraser prix, provenance, lecture | Fait, testé | e2e « réajouter garde le prix », `ignoreDuplicates` |
| Plages avec tomes existants et nouveaux | Fait, testé | e2e « seul le tome manquant est ajouté » |
| Modification distincte de l'ajout | Fait | panneau de tome (« Il est chez moi » / modification) |
| Prix, provenance, date facultatifs | Fait | date d'arrivée inconnue par défaut (plus de date du jour inventée) |
| Résultat honnête en cas d'échec ou de réussite partielle | Fait, testé | messages « tomes enregistrés, mais pas tes lectures », e2e erreur réseau |
| Droits et entrées vérifiés côté serveur | Fait, testé | zod partout, RLS, tests d'actions |
| Fiche personnelle : création, modification, suppression | Fait, testé | e2e « fiche personnelle, modifiable », « supprimer définitivement » |
| Aucun enrichissement du catalogue partagé depuis une fiche | Fait, testé | `created_by`, invisible pour un autre compte |
| Scan non affiché s'il ne fonctionne pas | Fait | aucun écran ni texte de la landing ne l'annonce |

## 5. Possession et lecture

| Exigence | État | Où / preuve |
|---|---|---|
| Posséder sans lire, lire sans posséder, suivre sans tome | Fait, testé | `reading.test.ts`, e2e |
| Progression en une action, tome terminé, annuler/corriger | Fait, testé | « Je commence », « Je l'ai fini » avec Annuler, panneau de tome |
| Tome sauté | Fait, testé | candidat `skipped`, `reading.test.ts` |
| Indiquer si l'on a aimé une série | Fait, testé | « J'ai aimé » / « Pas pour moi », e2e |
| « Lu jusqu'au tome N » explique et reste corrigeable | Fait, testé | `read-up-to.tsx` + `undoReadUpTo`, e2e |
| États « aucun tome », « aucune suggestion », « tout lu » distincts | Fait, testé | `shelfState`, `reading.test.ts` |
| Possédé, emprunté et lu non confondus ; compteurs cohérents | Fait | mêmes fonctions (`buildShelves`, `readerCounts`) partout |

## 6. Découverte

| Exigence | État | Où / preuve |
|---|---|---|
| Continuer une série, lire un tome déjà là, séries proches, autre univers | Fait, testé | Découvrir, `suggest.test.ts` |
| Justification fondée sur les données | Fait, testé | raisons tirées de séries lues, aimées, possédées ou de genres déclarés |
| Genres, longueur, statut, préférences déclarées | Fait | filtres et goûts déclarés |
| **Ambiance** | Manque (donnée absente) | pas dans le catalogue : ni utilisée ni simulée |
| Goûts déclarés distincts de la possession | Fait, testé | pondération (`docs/decouverte.md`) |
| Démarrage sans historique | Fait, testé | goûts déclarés + sélections, e2e « États vides » |
| Sélections éditoriales persistées | Fait | tables `editorial_selections*` |
| Peu de métadonnées, suggestions qui évoluent, refus exclus | Fait, testé | `suggest.test.ts`, « Pas pour moi » avec annulation |
| Pas de classification d'âge inventée, inconnu traité | Fait, testé | `docs/politique-contenu.md`, âge estimé jamais affiché |

## 7. Carte des goûts et visualisations

| Exigence | État | Où / preuve |
|---|---|---|
| Territoires, données réelles, clic vers séries et découvertes | Fait, testé | `taste-map.tsx`, e2e |
| État utile avec peu de données, alternative sans couleur | Fait | niveaux en mots, liste de séries, explication du calcul |
| Pondération qui n'écrase pas les autres goûts | Fait, testé | `suggest.test.ts` (série de 45 tomes = série de 3 tomes) |
| Lectures disponibles, dépenses, envies, chacune menant à une action | Fait, testé | « À lire chez toi » et « Noter d'anciennes lectures » dans Ma collection (e2e « Ma collection : à lire chez toi »), dépenses par mois + couverture, envies estimées dans Mon univers |

## 8. Argent et envies

| Exigence | État | Où / preuve |
|---|---|---|
| Payé / indicatif / inconnu strictement séparés | Fait, testé | `stats.test.ts` |
| Cadeau non compté comme dépense, prix inconnu jamais 0 | Fait, testé | `stats.test.ts` |
| « Acheté ! » avec prix réel facultatif | Fait, testé | e2e Envies |
| Acquisition qui ne détruit rien | Fait, testé | `ignoreDuplicates`, envie réajoutée sans prix qui garde le sien |
| Dépenses datées seulement | Fait, testé | `stats.test.ts` |
| Couverture des données | Fait, testé | « Prix renseigné pour X tomes sur Y achetés », e2e |
| Estimations avec leur base | Fait | « d'après ton dernier prix payé pour cette série / ton prix moyen payé » |
| Choisir et organiser ses prochains tomes souhaités | Fait | priorité « Prochain », section « Mes prochains tomes » |
| Pas de revente, spéculation, assurance | Fait | absent |

## 9. Sécurité et fiabilité

| Exigence | État | Où / preuve |
|---|---|---|
| Couvertures : hôtes autorisés, redirections, délai, taille, type réel | Fait, testé | `safe-image.test.ts` |
| Aucune URL arbitraire téléchargée par le serveur | Fait, testé | `actions.test.ts` (URL injectée ignorée) |
| Métadonnées externes relues côté serveur | Fait, testé | `actions.test.ts` |
| Limites d'usage (imports, ISBN, recherche externe) | Fait | `consume_import_quota` (nouveau quota de recherche) |
| Auth et autorisation de chaque mutation | Fait, testé | `getUser` + RLS, tests d'actions |
| Isolation entre utilisateurs, fiches personnelles comprises | Fait, testé | e2e, tests SQL, politiques `with check` |
| Politiques tables et stockage | Partiel | tables vérifiées. Bucket de stockage seulement en production, non vérifié |
| Pas de secret côté client ni dans les journaux | Fait | relecture |
| Routes cron et admin | Fait, testé | `cron-auth.test.ts` (secret absent refusé) |
| Bibliothèque privée par défaut | Fait, testé | migration 400 + test SQL, e2e anciens profils 404 |
| Erreur de base jamais présentée comme vide ou réussie | Fait, testé | toutes les lectures lèvent une erreur → écran d'erreur ; e2e erreur réseau |

## 10. Périmètre business

| Exigence | État |
|---|---|
| Cœur accessible, pas de paiement, publicité, affiliation, pression à l'achat | Fait |
| Pas de réseau social, classement public, marketplace, revente, contrôle parental, IA coûteuse, app native | Fait. Profils publics et partage retirés du parcours, données gardées |

## 11. Vérifications obligatoires

Voir `docs/tests.md` (procédures) et le compte rendu final (résultats).

**Non exécutés** :
- téléphone réel ;
- Google OAuth et e-mails réels ;
- indisponibilité réelle de MyAnimeList côté navigateur (couverte côté serveur et par tests unitaires).

## Résultats obtenus le 2026-10-16 (commit 7ad6699)

| Contrôle | Résultat |
|---|---|
| Typage, lint | OK |
| Tests unitaires | 149 / 149 |
| Tests SQL | `catalogue_merge_test.sql` 27 / 27 ; `private_libraries_test.sql` OK |
| Test d'accès au stockage | `cover_storage_test.sh` 10 / 10 |
| E-mails réels (projet de test, vraie boîte) | inscription confirmée, mot de passe changé |
| E-mails, modèles français (local, Mailpit) | `emails-local.mjs` 5 / 5, liens ouverts sur un autre navigateur |
| Répétition de la bascule (base au format production) | maintenance OK ; 11 migrations en 2 s ; retour arrière vérifié (schéma et données identiques) ; nouveau code OK |
| Parcours navigateur, base de test, compilation de production | 25 / 25 en mobile, 25 / 25 sur ordinateur |
| Parcours navigateur, base de répétition migrée | 25 / 25 |
| Lighthouse mobile (4 écrans) | performance 94 à 96, accessibilité 100, bonnes pratiques 96 |

**Non testé** :
- téléphone réel (tous les essais « mobile » sont faits dans Chromium avec un écran de 390×844) ;
- connexion Google (pas de fournisseur Google sur le projet de test) ;
- e-mails de production.
