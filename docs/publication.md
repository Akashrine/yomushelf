# Publication : procédure finale (répétée hors production)

Rien de ce document n'a été exécuté en production à la date de sa rédaction. Chaque étape **[accord]** demande l'autorisation explicite du propriétaire.

## Principe

Une courte fenêtre fermée par deux couches.

1. **Application** :
   - `MAINTENANCE_MODE=1` répond 503 à chaque page, action serveur et route API, avant tout accès à la base, y compris sur les chemins dynamiques terminés par `.png` ;
   - le propriétaire garde l'accès avec un jeton : ouvrir `/?maintenance=<jeton>` dépose un cookie valable 4 h.
2. **Base de données** : gel des écritures (`ops/freeze.sql`). Un déclencheur sur chaque table `public` refuse toute écriture, sauf si elle vient :
   - d'une session d'administration, c'est-à-dire d'un rôle membre de `postgres` (psql, ou `supabase db push` via `cli_login_postgres`) ;
   - d'un compte de contrôle inscrit dans `ops_freeze_allow`.

### Ce que le gel bloque (règles de production actuelles, lues en lecture seule)

| Qui | Écritures possibles sans gel | Avec le gel |
|---|---|---|
| Visiteur (clé publique) | liste d'attente, événement d'analyse, création de compte (qui insère un profil) | refusées ; l'inscription échoue en entier et le compte n'est pas créé |
| Lecteur avec une session ouverte, y compris sur une page déjà chargée | ajout, modification ou suppression de sa collection, profil, partage, analyse | refusées |
| Clé serveur utilisée via l'API | tout | refusées |
| Anciens déploiements (URL `*.vercel.app`, derrière l'authentification Vercel, accessibles à l'équipe seulement) | tout, via l'ancien code | refusées en base |
| Connexion, déconnexion, réinitialisation (schéma `auth`) | possibles | toujours possibles ; ce schéma n'est ni sauvegardé ni restauré, donc rien n'est perdu |

L'ancien code n'utilise pas Supabase depuis le navigateur. Une page déjà chargée écrit donc par une action serveur, qui atteint le nouveau déploiement et reçoit un 503, ou par l'API, qui est gelée.

Répété en local avec la vraie API Supabase ([`supabase/tests/freeze_test.sh`](../supabase/tests/freeze_test.sh)) :
- 10 vérifications sur 10 avec l'ancien schéma, 11 sur 11 avec le nouveau ;
- chaque refus vient bien du gel (code `P0001`) et d'aucune autre erreur ;
- les données publiques sont inchangées ;
- les migrations passent sous gel en 3 s ;
- un rôle `cli_login` simulé est autorisé ;
- le retour arrière sous gel redonne des données identiques ;
- les écritures reprennent après la levée du gel.

## Les 11 migrations attendues

Vérifié le 2026-10-16 avec `npx supabase db push --linked --dry-run` (simulation, rien n'est appliqué). La commande liste exactement ces 11 migrations, sans seed ni rôle.

1. `20261015000000_collection_value`
2. `20261016000000_reading_log`
3. `20261017000000_catalogue_discovery`
4. `20261017000100_catalogue_enrichment`
5. `20261017000200_public_profile_privacy`
6. `20261017000300_shelf_integrity`
7. `20261017000400_private_libraries`
8. `20261017000500_reader_preferences`
9. `20261017000600_catalogue_merge` (les outils seulement, aucune fusion)
10. `20261017000700_search_quota`
11. `20261017000800_cover_storage`

À l'étape 6, on s'arrête si la simulation affiche autre chose que cette liste.

## Conversion attendue des données réelles

Production, lecture seule, le 2026-10-16 :
- 1 compte, **9 séries** ;
- **113 tomes**, sans numéro répété ;
- **45 tomes lus**, pointeur de lecture maximum 18 ;
- aucun prix ni provenance : l'ancien schéma n'en a pas.

Après la migration, il faut exactement 113 tomes et 45 lectures, série par série, et aucun prix ni provenance inventés.

**L'écart 113 / 112 vient de deux jeux de données différents.** Le jeu de répétition (`supabase/rehearsal/legacy_data.sql`) est synthétique : 112 tomes, 33 lectures. Sur ce même jeu, avant et après migration, les chiffres sont identiques série par série : 9 séries, 112 tomes, 33 lus, 0 prix, 0 provenance. Les 113 tomes sont ceux de la production.

## Procédure

À préparer :
- l'URL de session de la base de production (`DB_URL`, rôle `postgres`, pooler en mode session, port 5432), dans un fichier local hors du dépôt ;
- un jeton de maintenance de 16 caractères ou plus ;
- une adresse de contrôle **externe à l'équipe** qui reçoit les e-mails d'authentification.

### Conditions préalables (avant toute interruption)

1. **Droits du rôle de restauration**, vérifiés sans modification : `DB_URL=… ops/check_restore_access.sh`. Il utilise le même mode de connexion que `ops/restore.sh` (psql dans le conteneur Supabase local, même `DB_URL`). Il vérifie :
   - `session_replication_role = replica` dans une transaction annulée ;
   - la désactivation des déclencheurs, annulée ;
   - la propriété des tables ;
   - la suppression dans l'historique des migrations ;
   - `pg_dump`.

   Résultat sur le projet hébergé de test, le 2026-10-16 : 6 sur 6. Si le mode `replica` est refusé en production, `ops/restore.sh` passe seul au mode `ordered` : déclencheurs désactivés, tables rechargées parents d'abord. Ce mode a été validé en local par un cycle complet (11 migrations, puis restauration), avec des données et un schéma identiques à la sauvegarde.
2. **SMTP de production** : un fournisseur qui envoie à toute adresse, depuis un domaine vérifié (SPF et DKIM). Le service intégré de Supabase n'envoie qu'aux membres de l'équipe, environ 2 e-mails par heure. Il ne suffit pas pour une ouverture publique.
3. **Configuration Auth sauvegardée**, valeurs exactes, hors du dépôt. Valeurs relevées le 2026-10-16 :
   - `SITE_URL` : `https://yomushelf.com` ;
   - liste de redirection : `https://yomushelf.com/**` seulement ;
   - sujets « Confirm Your Signup » et « Reset Your Password » ;
   - modèles par défaut de Supabase ;
   - SMTP personnalisé désactivé.

   Le site répond sur `https://www.yomushelf.com` (`yomushelf.com` redirige en 307). La liste doit donc gagner `https://www.yomushelf.com/**` et `https://yomushelf.vercel.app/**`.

1. **[accord] Variables Vercel de production** :
   - ajouter `MAINTENANCE_MODE=1` et `MAINTENANCE_BYPASS_TOKEN=<jeton>` ;
   - vérifier que `CRON_SECRET` fait au moins 16 caractères ;
   - laisser `CRON_INGEST_MODE` **non défini** : le cron reste désactivé.
2. **[accord] Fusionner la PR #2.** Vercel déploie le nouveau code, déjà en maintenance. Contrôle : `curl -I https://www.yomushelf.com/bibliotheque` et `curl -I https://yomushelf.vercel.app/bibliotheque` répondent 503.
3. **[accord] Geler les écritures** :
   ```bash
   psql "$DB_URL" -f ops/freeze.sql
   psql "$DB_URL" -c "insert into public.ops_freeze_allow values ('<adresse de contrôle>')"
   ```
4. **Sauvegarde vérifiée** : `DB_URL=… ops/backup.sh prod-avant-migration`.
   - L'empreinte doit montrer `user_collections|9|…` et `mangas|53|…`.
   - Garder les fichiers hors du dépôt.
5. **Relevé de conversion avant** : `psql "$DB_URL" -At -F'|' -f ops/conversion_before.sql > conv-avant.txt`. Attendu : 9 lignes, 113 tomes, 45 lus.
6. **[accord] Migrations** :
   ```bash
   npx supabase db push --linked --dry-run   # exactement les 11 ci-dessus
   npx supabase db push --linked
   ```
7. **Regeler**, pour couvrir les nouvelles tables : `psql "$DB_URL" -f ops/freeze.sql`.
8. **Relevé de conversion après** : `psql "$DB_URL" -At -F'|' -f ops/conversion_after.sql > conv-apres.txt`. Les colonnes 1 à 4 doivent être identiques au relevé d'avant ; prix et provenance doivent valoir 0.
9. **[accord] Configuration Auth** (tableau de bord Supabase de production) :
   - modèles d'e-mail en français : contenu de `supabase/templates/confirmation.html` et `recovery.html`, sujets de `supabase/config.toml` ;
   - URL de redirection autorisées : `https://www.yomushelf.com/auth/confirm**` et `https://yomushelf.vercel.app/auth/confirm**`, en gardant `/auth/callback` pour Google ;
   - vérifier le serveur SMTP utilisé (Authentication → SMTP) ;
   - ces réglages se font **après** le déploiement du nouveau code ; avant, le lien des e-mails serait cassé.
10. **Contrôle de publication**, avec le jeton de maintenance, sur `https://www.yomushelf.com` :
    - le compte existant retrouve sa bibliothèque (9 séries, tomes et lectures) ; aucune page d'erreur sur `/bibliotheque`, `/decouvrir`, `/univers`, `/ajouter` et une page série ;
    - avec l'adresse de contrôle (procédure de référence : `e2e/emails-local.mjs`) :
      - inscription, e-mail reçu en français ;
      - confirmation par le lien depuis un autre appareil ;
      - connexion ;
      - « mot de passe oublié » : e-mail reçu, lien ouvert, nouveau mot de passe ;
      - reconnexion ;
    - gel effectif : une inscription avec une autre adresse échoue ;
    - **Google** : la connexion Google est proposée en production (fournisseur activé, bouton « Continuer avec Google »). Le propriétaire clique, se connecte avec son compte Google et doit arriver sur `/bibliotheque`. **Ce n'est pas testé à ce jour** : le projet de test n'a pas d'identifiant OAuth Google.
11. **Lever le gel** : `psql "$DB_URL" -f ops/unfreeze.sql`.
12. **[accord] Réouverture** : retirer `MAINTENANCE_MODE`, redéployer, vérifier que plus aucune page ne répond 503, puis **changer le jeton** de maintenance.

## Retour arrière avant réouverture

### Déclencheurs (un seul suffit)

1. `db push` échoue, ou sa simulation ne liste pas exactement les 11 migrations.
2. Le relevé après diffère du relevé avant pour les tomes ou les lectures d'une série, ou des prix ou provenances apparaissent.
3. Une page principale renvoie une erreur, ou un écran d'erreur, pour le compte existant.
4. Le contrôle d'authentification (inscription, confirmation, connexion, réinitialisation) échoue sans cause de configuration corrigeable en quelques minutes.
5. Les fiches du catalogue (53 avant) ou les profils diminuent sans explication.

Un problème de configuration (modèle d'e-mail, URL de redirection, SMTP) se corrige sur place, gel et maintenance toujours actifs. Un problème de code ou de données déclenche le retour arrière.

### Exécution

Gel et maintenance restent actifs pendant tout le retour arrière.

1. `DB_URL=… ops/restore.sh prod-avant-migration` :
   - rejoue les annulations en ordre inverse ;
   - recharge les données de la sauvegarde ;
   - vérifie l'empreinte ;
   - peut être relancé sans risque.
2. Vercel → Instant Rollback vers le déploiement précédent (`yomushelf-mtjdhb5dz…`).
3. Si l'étape 9 a eu lieu, remettre **exactement** les valeurs sauvegardées (condition préalable 3) : `SITE_URL`, liste de redirection, sujets, modèles et réglage SMTP. Pas les valeurs par défaut.
4. `psql "$DB_URL" -f ops/unfreeze.sql`, puis retirer `MAINTENANCE_MODE`.

**Écritures perdues** :
- aucune écriture publique : le gel est actif depuis avant la sauvegarde ;
- les comptes de contrôle créés pendant la fenêtre gardent un profil minimal, et le script les liste ;
- les connexions et réinitialisations (schéma `auth`) ne sont pas touchées.

**Après réouverture**, on corrige en avant. Un retour arrière ferait perdre toutes les écritures faites depuis la réouverture, sauf export préalable.

## Répétition effectuée (base locale au format production)

| Étape | Résultat |
|---|---|
| Ancien code sur l'ancien schéma | 9 séries, 112 tomes, 33 lus |
| Maintenance côté application | 503 partout, y compris `/bibliotheque/x.png` ; fichiers statiques servis |
| Gel de la base, via la vraie API | 10/10 et 11/11 ; l'inscription d'un inconnu est annulée en entier |
| Sauvegarde puis 11 migrations sous gel | 3 s ; conversion identique série par série |
| Contrôle Auth sous maintenance et gel (Mailpit) | 6/6 : inscription, confirmation sur un autre navigateur, réinitialisation, connexion, lien réutilisé refusé |
| Échec simulé puis `ops/restore.sh` sous gel | données identiques à la sauvegarde ; relance sûre ; l'ancien code refonctionne |
| Cycle complet, modes `replica` et `ordered` | données et schéma `public` identiques à la sauvegarde (le cycle a corrigé deux annulations : colonne `audience_age_year` oubliée, texte exact de `get_user_stats`) |
| Nouveau code sur les données converties | parcours 25/25 |

## Opérations séparées (accords distincts)

- **Doublons de production (Naruto, One Piece)** : lancer d'abord la simulation `catalogue_merge(keep, drop)` et lire son rapport. Appliquer ensuite, de préférence sous maintenance et gel. Si les titres diffèrent, `p_same_work => true` est obligatoire.
- **Import nocturne** : il reste désactivé. Pour l'activer, simulation d'abord (`?mode=dry_run`), puis `CRON_INGEST_MODE=on`, avec des limites de 20 écritures et 20 couvertures par passage.
