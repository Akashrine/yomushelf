# Publication : procédure exacte (répétée hors production)

Rien de ce document n'a été exécuté en production. Chaque étape **[accord]** demande l'autorisation explicite du propriétaire.

## Pourquoi une courte maintenance plutôt que des migrations rétrocompatibles

Le code en production (`origin/main`, 06af327) écrit directement dans `user_collections.owned_volumes` et `last_read_volume`. Le nouveau modèle lit `user_volumes` et `user_readings`.

Constat en répétition, sur une base migrée servie par l'ancien code :
- les pages s'affichent encore ;
- un tome ajouté par l'ancien code n'atterrit que dans l'ancien tableau, et le nouveau code ne le voit pas : écriture perdue sans message ;
- les actions de profil échouent (`permission denied`).

Rendre les migrations compatibles avec l'ancien code demanderait une synchronisation dans les deux sens entre les deux modèles, pendant quelques minutes, avec un risque de boucle et de corruption. C'est disproportionné pour une production qui compte (lecture seule, 2026-10-16) :
- 1 compte, 9 séries, 113 tomes, 53 fiches du catalogue ;
- aucun profil public ;
- dernière écriture le 2026-09-03.

**Retenu : une maintenance explicite de quelques minutes.** Elle coupe toute écriture **par l'application** du début à la fin.

Limite connue : l'API Supabase (PostgREST, Auth) reste joignable directement avec la clé publique pendant la fenêtre. Quelqu'un pourrait créer un compte, ou écrire avec son propre jeton, sans passer par l'application. Avec un seul compte en production, le risque est accepté. `ops/restore.sh` liste et traite les comptes créés après la sauvegarde.

### Mode maintenance (dans le nouveau code)

`MAINTENANCE_MODE=1` répond 503 à chaque page, action serveur et route API, **avant tout accès à la base**. C'est vérifié en répétition sur les pages, les actions serveur, la connexion, l'API et le cron. Cela inclut les chemins dynamiques terminés par une extension d'image (`/bibliotheque/x.png`). Seuls les fichiers statiques passent : `/_next/static`, `/icons/` et les fichiers à la racine.

Le propriétaire garde l'accès avec `MAINTENANCE_BYPASS_TOKEN` (16 caractères ou plus) :
- ouvrir `/?maintenance=<jeton>` une fois ;
- un cookie garde l'accès 4 heures pour ce navigateur ;
- un mauvais jeton est refusé ;
- le jeton passe dans une URL et apparaît donc dans les journaux Vercel et l'historique du navigateur : **le changer après la fenêtre**.

## État vérifié de la production (lecture seule)

Migrations appliquées : jusqu'à `20261014120000`.

À appliquer, dans cet ordre :

| Migration | Rôle |
|---|---|
| `20261015000000_collection_value` | un tome = une ligne, envies |
| `20261016000000_reading_log` | lectures indépendantes de la possession |
| `20261017000000_catalogue_discovery` | fiches personnelles, recherche tolérante, archivage |
| `20261017000100_catalogue_enrichment` | titres français, genres, sélections, âges vérifiés seulement |
| `20261017000200_public_profile_privacy` | |
| `20261017000300_shelf_integrity` | |
| `20261017000400_private_libraries` | |
| `20261017000500_reader_preferences` | |
| `20261017000600_catalogue_merge` | outils seulement : aucune fusion lancée |
| `20261017000700_search_quota` | |
| `20261017000800_cover_storage` | limites du bucket de couvertures |

Vérifications préalables faites en production (lecture seule) :
- aucune fiche hors des nouvelles bornes (titre de plus de 300 caractères, plus de 500 tomes) ;
- les 50 titres du top 50 correspondent exactement aux clés de l'enrichissement ;
- 2 doublons existent (Naruto `mal_id` 11 et One Piece `mal_id` 13, chacun utilisé par la collection du compte) ;
- Gunnm (`mal_id` 768) sera enrichi sur place.

## Procédure

Variables à préparer :
- **Production** : `MAINTENANCE_MODE=1` et `MAINTENANCE_BYPASS_TOKEN=<jeton>`, `CRON_SECRET` (16 caractères ou plus) ;
- **nouvelles variables** : `CRON_INGEST_MODE` **non défini**, ce qui laisse l'import désactivé.

1. **[accord]** Fusionner la PR #2 dans `main` avec `MAINTENANCE_MODE=1` déjà défini en production. Vercel déploie le nouveau code, qui ne sert que la page de maintenance : l'ancien code ne tourne plus, plus aucune écriture.
2. Vérifier la maintenance. `curl -I https://<domaine>/bibliotheque` doit répondre 503. Une requête POST doit aussi répondre 503.
3. **Sauvegarde vérifiée** :
   ```bash
   DB_URL="<URL de session de la base de production>" ops/backup.sh prod-avant-migration
   ```
   - Garder `prod-avant-migration.dump` et `.fingerprint` hors du dépôt.
   - Vérifier l'empreinte : `user_collections|9|…`, `mangas|53|…`.
   - Si une sauvegarde Supabase est disponible (tableau de bord → Backups), noter son horodatage.
4. **[accord]** Migrations :
   ```bash
   npx supabase db push --linked --dry-run   # doit lister exactement les 11 migrations ci-dessus
   npx supabase db push --linked
   ```
   Durée en répétition : environ 2 secondes.
5. Contrôles avant réouverture, avec le jeton de contournement :
   - bibliothèque du compte : 9 séries, tomes et lectures retrouvés ;
   - Découvrir et Mon univers s'ouvrent ;
   - SQL en lecture seule : `select count(*) from profiles where is_public` donne 0.
6. **[accord]** Réouverture : retirer `MAINTENANCE_MODE` puis redéployer (Vercel → Redeploy). Vérifier que `/bibliotheque` ne répond plus 503.

## Si quelque chose échoue

| Moment de l'échec | Retour à un état fonctionnel | Écritures perdues |
|---|---|---|
| Migration en erreur (étape 4) | Chaque migration tourne dans sa transaction. Les migrations déjà passées restent. Garder la maintenance, puis `ops/restore.sh prod-avant-migration`, puis remettre l'ancien déploiement (Vercel → Instant Rollback vers `yomushelf-mtjdhb5dz…`) et retirer la maintenance. | aucune (maintenance active depuis avant la sauvegarde) |
| Nouveau code défaillant après migration (étapes 5-6) | **Ne pas** remettre l'ancien code seul : sur le nouveau schéma, il perd ses écritures sans rien dire (constaté en répétition). Garder la maintenance, puis `ops/restore.sh prod-avant-migration`, puis Instant Rollback vers l'ancien déploiement, puis retirer la maintenance. | aucune |
| Problème découvert après réouverture | Correction en avant de préférence. Si un retour arrière est indispensable : remettre la maintenance, exporter les lignes écrites depuis la réouverture (`user_volumes`, `user_readings`, `wishlist_items` par `created_at`/`updated_at`, `discovery_dismissals`, `user_collections`), puis lancer `ops/restore.sh`. | tout ce qui a été écrit après la réouverture, sauf ce qui a été exporté et ressaisi |

`ops/restore.sh` :
1. rejoue les fichiers d'annulation dans l'ordre inverse, ce qui remet le schéma d'origine ;
2. recharge en une transaction les lignes des anciennes tables depuis la sauvegarde, ce qui annule les conversions à perte ;
3. nettoie l'historique des migrations ;
4. recrée un profil minimal pour les comptes créés après la sauvegarde et les liste (leurs données postérieures sont perdues) ;
5. compare l'empreinte des données à celle de la sauvegarde, et échoue s'il reste un écart.

Chaque annulation retire sa ligne de l'historique dans la même transaction. Après un échec partiel, le script se relance sans rejouer ce qui est déjà annulé.

## Répétition effectuée (base locale, 2026-10-16)

| Étape | Résultat |
|---|---|
| Base au format production : 7 migrations, 1 compte, 9 séries, 112 tomes au format ancien | ancien code (06af327) : 9 séries, 112 tomes, 33 lus, budget 844 € |
| Nouveau code en maintenance | 503 sur pages, actions serveur, connexion et cron ; contournement par jeton OK, mauvais jeton refusé |
| Sauvegarde (`pg_dump`, schémas `public` et historique) | 74 Ko, 11 tables de données |
| 10 migrations par `supabase migration up` (équivalent de `db push`) | 2 s, 112 tomes et 33 lectures convertis |
| Échec simulé : ancien code sur base migrée | s'affiche, mais écrit dans le vide et le profil échoue : à proscrire |
| Retour arrière : annulations en ordre inverse, puis rechargement des données | 2 s. Schéma identique à l'original (comparaison `pg_dump -s`). Données identiques ligne à ligne sur les 9 tables (empreintes égales). Historique revenu à 7 migrations. |
| Ancien code après retour arrière | 9 séries, 112 tomes, 33 lus, budget 844 € : identique au départ |
| `ops/backup.sh` puis `ops/restore.sh`, avec deux comptes créés après la sauvegarde | « Données identiques à la sauvegarde (profils : 1 + 2 recréés) ». Une seconde exécution ne rejoue aucune annulation, et l'historique reste à 7. |
| Chemin qui réussit : 11 migrations définitives sur une base au format production remise à neuf, serveurs d'application arrêtés | 2 s. 112 tomes, 33 lectures et 9 séries convertis ; ages : 26 séries vérifiées, 2 avis sur tomes |
| Nouveau code, maintenance retirée | compte au format ancien : bibliothèque convertie, « Tu peux lire Bleach tome 10 », 0 erreur JavaScript ; parcours navigateur 25/25 |
| Import nocturne sur cette base | sans secret 401 ; `GET` → « désactivé » ; simulation : 188 séries examinées, 39 doublons écartés, 20 prévues (limite), **aucune écriture** (nombre de fiches et dernière date de mise à jour inchangés) |

Note de durée : une passe avec les serveurs d'application locaux encore connectés a pris 3 min 43 s, par attente de verrous ; la même passe serveurs arrêtés prend 2 s. En production, la maintenance coupe le trafic applicatif avant les migrations.

La répétition a aussi corrigé trois écarts des fichiers d'annulation, trouvés par la comparaison de schéma : droits sur `mangas`, droit de lecture sur `profiles.sharing_locked`, droit d'exécution de `get_public_profile`.

## E-mails de compte en français [accord séparé, configuration hors code]

Les modèles par défaut de Supabase (en anglais) envoient un lien PKCE qui ne fonctionne que dans le navigateur qui l'a demandé : ouvert ailleurs, le compte est confirmé mais l'écran parle d'un lien invalide (constaté avec un vrai e-mail sur le projet de test). Les modèles `supabase/templates/confirmation.html` et `recovery.html` (français, lien `token_hash` vérifié par `/auth/confirm`, valable depuis n'importe quel appareil) sont actifs en local et testés (`e2e/emails-local.mjs`, 5/5). À reporter dans le tableau de bord du projet de test puis de production (Authentication → Emails → Templates, sujets dans `supabase/config.toml`), et ajouter `https://<domaine>/auth/confirm` aux URL de redirection autorisées. Sans ce report, le code accepte encore les liens par défaut (même navigateur seulement).

**Ordre impératif** : changer les modèles **après** le déploiement du nouveau code. Avec l'ancien code, le lien produit serait cassé (`/auth/callback&token_hash=…`). URL de redirection à autoriser : `https://<domaine>/auth/confirm**`.

## Doublons de production [accord séparé]

Après réouverture, lancer seulement la simulation :

```sql
select c.keep_title, r.* from catalogue_duplicate_candidates() c, lateral catalogue_merge(c.keep_id, c.drop_id) r;
```

Lire le rapport, puis appliquer paire par paire après accord, de préférence pendant une maintenance.

Une paire « autre nom » (titre égal à un autre nom de la fiche conservée) peut être une suite ou un dérivé, par exemple Tokyo Ghoul et Tokyo Ghoul:re. La fusion reste **bloquée** tant qu'on n'a pas vérifié que c'est la même œuvre, puis relancé avec `p_same_work => true`.

## Import nocturne [accord séparé]

Il est désactivé au premier déploiement (`CRON_INGEST_MODE` non défini).

1. Simulation sans écriture : `curl -H "Authorization: Bearer $CRON_SECRET" "https://<domaine>/api/cron/ingest-mangas?mode=dry_run"`.
2. Lire le plan.
3. Activation : `CRON_INGEST_MODE=on`. Limites : `CRON_INGEST_MAX_WRITES` (20 par défaut) et `CRON_INGEST_MAX_COVERS` (20 par défaut).
