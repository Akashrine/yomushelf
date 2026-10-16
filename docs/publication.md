# Publication : procédure exacte

Rien de ce document n'a été exécuté en production. Chaque étape marquée **[accord]** demande l'autorisation explicite du propriétaire.

## État réel vérifié (lecture seule, 2026-10-16)

`supabase migration list --linked` sur le projet de production `rkhqyfzuxtlcnqmhavan` :

| Migration | Production |
|---|---|
| 20240001000000 → 20240002000001 | appliquées |
| 20261014000000_security_hotfix | appliquée |
| 20261014120000_catalog_import_quota | appliquée |
| 20261015000000_collection_value | **à appliquer** |
| 20261016000000_reading_log | **à appliquer** |
| 20261017000000_catalogue_discovery | **à appliquer** |
| 20261017000100_catalogue_enrichment | **à appliquer** |
| 20261017000200_public_profile_privacy | **à appliquer** |
| 20261017000300_shelf_integrity | **à appliquer** |
| 20261017000400_private_libraries | **à appliquer** |
| 20261017000500_reader_preferences | **à appliquer** |
| 20261017000600_catalogue_merge | **à appliquer** (outils seulement : aucune fusion n'est lancée) |
| 20261017000700_search_quota | **à appliquer** |

L'ordre des fichiers est l'ordre d'application. Les dix migrations ont été appliquées, dans cet ordre, sur la base locale (y compris par `db reset`) et sur le projet de test `fcpyhtfacqnzohwzyfcp`. Sur cette base de test, 20261014120000 avait été appliquée en premier, comme en production.

Le code de la branche a besoin du nouveau schéma, et l'ancien code casse avec le nouveau schéma. On applique donc les migrations puis on déploie immédiatement.

## Sauvegardes nécessaires avant toute chose

1. **Sauvegarde Supabase** : vérifier dans le tableau de bord (Database → Backups) qu'une sauvegarde de moins de 24 h existe, ou activer le PITR si le plan le permet.
2. **Export logique** conservé hors de Supabase :
   ```bash
   npx supabase db dump --linked -f prod-schema-$(date +%F).sql
   npx supabase db dump --linked --data-only -f prod-data-$(date +%F).sql
   ```
3. Vérifier que le fichier de données contient bien `user_collections`, `user_volumes` et `wishlist_items` (taille non nulle).

## Changements irréversibles ou à perte, et limites des annulations

| Migration | Ce qui ne revient pas avec le fichier `supabase/rollbacks/…_down.sql` |
|---|---|
| 20261015000000 | Restauration partielle du modèle précédent : voir l'en-tête du fichier d'annulation. |
| 20261016000000 | **À perte.** Les colonnes `read_status` et `read_at` sont supprimées après conversion en lectures. L'annulation perd les lectures de tomes non possédés, transforme les origines inconnues en « other » et remplace les dates inconnues par la date de création. |
| 20261017000000 | L'annulation supprime les fiches personnelles (et leurs tomes et lectures), remet les séries retirées dans la bibliothèque, et efface genres, âges, résumés et autres noms. |
| 20261017000100 | Les titres français, auteurs, nombres de tomes et statuts écrasés ne sont pas restaurés, sauf l'ancien titre des 11 séries du top 50 renommées. Les anciens imports enrichis gardent leurs nouvelles données. |
| 20261017000200 | Aucune perte. |
| 20261017000300 | Aucune perte. Les contraintes `NOT VALID` ne vérifient pas les lignes existantes. |
| 20261017000400 | L'annulation remet publics les profils qui l'étaient, grâce à la table `profile_visibility_backup`. |
| 20261017000500 | **À perte.** « J'ai aimé », suggestions écartées et goûts déclarés sont supprimés. |
| 20261017000600 | Retire les outils de fusion. **Une fusion déjà appliquée n'est pas annulée.** |
| 20261017000700 | Supprime les compteurs de recherche. |

**Seule vraie annulation complète : la restauration de la sauvegarde.** Les fichiers d'annulation servent à revenir en arrière vite quand la perte listée est acceptable.

## Procédure

1. **[accord]** Pousser la branche `feat/compagnon-lecture`, puis ouvrir une PR vers `main`.
2. Prévisualisation Vercel de la branche, branchée sur le projet de **test** (variables déjà limitées à la branche `lot-1-lecteur` : les étendre à la nouvelle branche). Refaire les parcours (`docs/tests.md`, section 5) sur l'URL de prévisualisation.
3. Variables de production à vérifier avant le déploiement :
   - `CRON_SECRET` : au moins 16 caractères. Sinon les routes cron et admin refusent tout, ce qui est voulu.
   - `MAL_CLIENT_ID` : sans lui, la recherche reste locale et l'interface le dit.
   - `NEXT_PUBLIC_APP_URL` : sert aux liens des e-mails.
4. Sauvegardes (section précédente).
5. **[accord]** Appliquer les migrations :
   ```bash
   npx supabase db push --linked --dry-run   # doit lister exactement les 10 migrations ci-dessus
   npx supabase db push --linked
   ```
6. **[accord]** Fusionner la PR, ce qui déclenche le déploiement Vercel de production juste après l'étape 5.
7. Vérifications en production, sans écriture sur les données des lecteurs :
   - ouvrir `/bibliotheque`, `/decouvrir`, `/univers` et `/ajouter` avec un compte de test ;
   - `/u/<ancien-slug>` répond 404 ;
   - en SQL (lecture seule) : `select count(*) from profiles where is_public;` doit valoir 0.
8. **Doublons [accord séparé]** :
   - lancer d'abord la simulation, sans rien appliquer :
     ```sql
     select c.keep_title, r.* from catalogue_duplicate_candidates() c, lateral catalogue_merge(c.keep_id, c.drop_id) r;
     ```
   - lire le rapport : contradictions, comptes concernés ;
   - appliquer paire par paire seulement après accord, avec `catalogue_merge(keep, drop, true)`.

## Points à décider avant ou après la publication

- **Cron nocturne** : Vercel Cron appelle les routes en `GET`, mais `/api/cron/ingest-mangas` n'accepte que `POST`.
  - En l'état, l'import nocturne ne s'exécute donc probablement jamais.
  - Le corriger ferait écrire dans le catalogue de production chaque nuit. La route est désormais protégée contre l'écrasement des fiches éditoriales et contre les doublons.
- **Âges CNLJ** : revérifier les 28 âges marqués `cnlj` (`docs/politique-contenu.md`).
- **Séries coréennes** du catalogue éditorial (Solo Leveling, Omniscient Reader's Viewpoint) : les garder ou non.
- **Stockage des couvertures** : le bucket `manga-covers` et ses règles n'existent qu'en production (créés depuis le tableau de bord, pas dans les migrations). Ils n'ont pas pu être vérifiés.
