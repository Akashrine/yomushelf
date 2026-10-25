# Tests et validation reproductibles

**Jamais contre la production.** Toutes les commandes ci-dessous visent une base locale (Docker) ou le projet de test `yomushelf-preview`.

## 1. Contrôles du code

```bash
npx tsc --noEmit -p .        # typage
npx eslint src               # lint
npx vitest run               # tests unitaires (domaine, actions, sécurité)
npx next build               # compilation de production
```

Ce que couvrent les tests unitaires (`src/**/*.test.ts`) :

| Domaine | Fichier | Scénarios |
|---|---|---|
| Lecture | `lib/collection/reading.test.ts` | prochain tome, tome sauté, lecture sans possession (tome à trouver), possession sans lecture, états vides distincts |
| Découverte | `lib/discovery/suggest.test.ts` | suggestions expliquées, démarrage sans historique (goûts déclarés), « J'ai aimé » / « Pas pour moi », genres évités, âge inconnu jamais suggéré, série longue qui n'écrase pas les autres, univers différent, filtre CNLJ |
| Argent | `lib/univers/stats.test.ts` | prix payé / indicatif / inconnu, cadeaux à part, dates inconnues hors graphiques, couverture des prix, estimation des envies et sa base |
| Recherche | `lib/manga-api/merge.test.ts` | catalogue d'abord, doublons retirés (identifiant, titre, autres noms) |
| Import | `app/(app)/ajouter/actions.test.ts` | authentification, quota, données du fournisseur relues côté serveur, refus du catalogue commun, ISBN qui ne crée jamais de série partagée |
| Politique | `lib/manga-api/mal.test.ts` | type d'œuvre, origine, signal de contenu |
| Couvertures | `lib/manga-api/safe-image.test.ts` | hôtes autorisés, redirections contrôlées, taille, délai, type réel du fichier |
| Routes privilégiées | `lib/server/cron-auth.test.ts` | secret absent ou court refusé |
| Maintenance | `lib/maintenance.test.ts` | tout bloqué sauf avec le jeton, jeton court ou absent refusé |
| Import nocturne | `lib/catalogue/ingest.test.ts` | désactivé par défaut, simulation sans écriture, fiches éditoriales intactes, doublons évités, limites |

## 2. Migrations sur une base locale

La pile locale tourne depuis une copie du dossier `supabase/` avec des ports décalés (554xx), car un autre projet occupe les ports par défaut :

```bash
SP=<dossier de travail>
rsync -a --exclude .temp supabase "$SP/yomu-local/"
cd "$SP/yomu-local/supabase"
sed -i '' -E 's/^port = 54321/port = 55421/; s/^port = 54322/port = 55422/; s/^shadow_port = 54320/shadow_port = 55420/; s/^port = 54323/port = 55423/; s/^port = 54324/port = 55424/; s/^port = 54327/port = 55427/; s/^port = 54329/port = 55429/' config.toml
cd .. && npx supabase start && npx supabase db reset --local
```

`db reset` applique toutes les migrations, puis les seeds, puis rejoue l'enrichissement du catalogue (voir `[db.seed]` dans `supabase/config.toml`).

Après une migration appliquée à la main avec `psql`, rechargez le schéma de l'API :

```sql
notify pgrst, 'reload schema';
```

## 3. Tests SQL (transaction annulée, rien ne persiste)

```bash
DB=postgresql://postgres:postgres@localhost:5432/postgres
docker cp supabase/migrations/20261017000400_private_libraries.sql supabase_db_Yomushelf-v2:/tmp/m400.sql
docker cp supabase/rollbacks/20261017000400_private_libraries_down.sql supabase_db_Yomushelf-v2:/tmp/m400_down.sql
docker cp supabase/tests/private_libraries_test.sql supabase_db_Yomushelf-v2:/tmp/t400.sql
docker exec supabase_db_Yomushelf-v2 psql "$DB" -f /tmp/t400.sql | grep -E "T[0-9]|ERROR"

docker cp supabase/tests/catalogue_merge_test.sql supabase_db_Yomushelf-v2:/tmp/t600.sql
docker exec supabase_db_Yomushelf-v2 psql "$DB" -f /tmp/t600.sql | grep -E "T[0-9]|ERROR"

# Migrations 20261022000200 à 20261022000400 appliquées d'abord
docker exec -i supabase_db_Yomushelf-v2 psql "$DB" -q < supabase/tests/wishlist_family_share_test.sql
```

- `private_libraries_test.sql` : profils rendus privés, ancien état sauvegardé, collections intactes, appel anonyme refusé, retour au public impossible.
- `catalogue_merge_test.sql` (21 vérifications) :
  - la simulation ne modifie rien ;
  - une contradiction bloque la fusion ;
  - prix, provenances, dates, lectures et envies sont préservés ;
  - aucune ligne n'est mélangée entre deux lecteurs ;
  - la fusion est rejouable ;
  - un lecteur ne peut pas la lancer.
- `wishlist_family_share_test.sql` (39 vérifications, comptes créés par le test) :
  - un enfant de moins de 15 ans ne partage jamais lui-même, le parent seulement après son accord ;
  - la page partagée ne montre qu'un prénom et les envies, rien de personnel ;
  - « Je l'offre » : le premier gagne, seul le même navigateur peut annuler, et lui seul le voit comme le sien ; un double appui reste à lui ;
  - 40 actions par lien et par 10 minutes, puis refus ; un nouveau lien repart à zéro ;
  - le lecteur ne voit jamais les tomes offerts, ni l'empreinte du lien ;
  - un nouveau lien coupe l'ancien ; lien révoqué ou expiré : rien à voir ni à réserver ;
  - accord du parent retiré ou âge modifié : le lien s'arrête seul.

Les comptes de test viennent de `e2e/reset.sql`, à charger d'abord.

## 3 bis. Stockage des couvertures

La pile locale doit tourner avec le service de stockage (`supabase start` sans exclure `storage`).

```bash
API=http://127.0.0.1:55421 ANON=<clé anon> SERVICE=<clé service> \
USER_EMAIL=<compte de test> USER_PASSWORD=<mot de passe> bash supabase/tests/cover_storage_test.sh
```

Dix vérifications :
- le serveur dépose une couverture, et tout le monde peut la lire ;
- un visiteur ou un lecteur connecté ne peut ni déposer, ni remplacer, ni supprimer, ni lister ;
- un SVG et un fichier de 3 Mo sont refusés par le bucket lui-même.

## 3 bis 2. Gel des écritures (bascule de production)

Contre la vraie API Supabase locale, base gelée par `ops/freeze.sql` :

```bash
API=… ANON=… SERVICE=… READER_EMAIL=<lecteur existant> READER_PASSWORD=… ALLOWED_EMAIL=<adresse de contrôle> \
bash supabase/tests/freeze_test.sh old   # ou new après les migrations
```

Le test vérifie que chaque refus porte le code `P0001`, c'est-à-dire qu'il vient bien du gel. Le contrôle Auth sous maintenance et gel se lance avec `EMAIL=<adresse autorisée> BYPASS=<jeton> node e2e/emails-local.mjs`.

## 3 ter. Répétition de la bascule de production

Voir `docs/publication.md`, section « Répétition effectuée ». Outils :
- `supabase/rehearsal/legacy_data.sql` : données au format ancien ;
- `supabase/rehearsal/check-app.mjs` : sonde de l'application ;
- `ops/backup.sh`, `ops/restore.sh` et `ops/fingerprint.sql`.

## 4. Parcours dans un vrai navigateur

Une commande, sur la base locale uniquement :

```bash
e2e/run.sh            # parcours mobile, parcours ordinateur, puis liste de Noël
e2e/run.sh journeys   # seulement les parcours
e2e/run.sh family     # seulement la liste de Noël
e2e/run.sh serve      # l'application seule sur la base locale, pour l'explorer
```

Le lanceur :
- exige la pile locale (`npx supabase start`, conteneur `supabase_db_Yomushelf-v2`, API sur le port 55421) et refuse de tourner si l'adresse n'est pas locale ;
- donne l'adresse et les clés locales à l'application par son environnement (qui l'emporte sur `.env.local`) : le `.env.local` de production n'est jamais modifié ;
- vide les comptes de test avant chaque passage (`e2e/reset.sql`) puis les vide à nouveau à la fin ;
- coupe les emails (`RESEND_API_KEY` vide : ils sont écrits dans le journal du serveur de développement) et la recherche de jaquettes.

Comptes de test (mot de passe `e2e-yomushelf`) :

| Compte | Profil |
|---|---|
| `e2e@yomushelf.local` | 15 ans et plus, bibliothèque vide |
| `other@yomushelf.local` | 15 ans et plus |
| `kid@yomushelf.local` | moins de 15 ans, accord du parent (`parent.leo@yomushelf.local`) donné |

Chromium : celui du cache Playwright (`npx playwright-core install chromium`), ou `CHROME=<chemin>`. Un seul scénario : `ONLY="Découvrir" BASE=http://localhost:3100 node e2e/journeys.mjs` (les étapes se suivent : celle choisie peut dépendre des précédentes). `SHOTS=<dossier>` garde les captures, dont celle de l'étape qui échoue.

Scénarios couverts par `e2e/journeys.mjs` :

- **Premier lancement** : une bibliothèque vide mène à l'ajout rapide ; deux séries et leurs tomes en quelques touches ; le mur de couvertures, le bouton « Mes envies », « À lire chez toi ».
- **Fiche série** : toucher un tome l'ajoute, le retoucher l'enlève ; toucher le tome 29 propose les 28 d'avant ; noter un tome lu, compté dans Mon univers.
- **Recherche** : zéro, un et plusieurs résultats du catalogue, sans doublon.
- **Fiche personnelle** : création, modification, invisible pour un autre compte, suppression qui demande le titre.
- **Retirer puis remettre** une série : les lectures sont gardées.
- **Découvrir** : des rangées, chaque série une fois, aucune série déjà chez soi.
- **Envies et argent** : envie achetée avec son prix ; « Ma collection » estimée au prix de l'éditeur, sans rien saisir.
- **Carte des goûts**, **erreur réseau** sur une sauvegarde (message honnête, rien d'annoncé à tort), anciennes adresses redirigées, anciens profils publics en 404.
- **Réglages derrière le rouage** : Mon univers ne garde que les chiffres, pseudo, déconnexion, reconnexion.
- **Moins de 15 ans** : la recherche ne montre que les séries à âge vérifié, rien ne part vers MyAnimeList, les refus ne vident pas la liste.
- **Pages publiques** : confidentialité à jour, mentions légales, page privée renvoyée vers la connexion.
- **Création de compte** (`SIGNUP=1`) : l'âge est demandé, puis l'application s'ouvre.

### Liste de Noël partagée (`e2e/family-list.mjs`)

`e2e/run.sh family` : l'application tourne sans Resend (`next dev`), les emails sont écrits dans son journal, où le script lit les liens. Comptes : `kid@` est l'enfant (moins de 15 ans, accord du parent), `other@` un adolescent de 15 ans ; `e2e/seed-family.sql` leur donne des envies.

Scénarios (45 vérifications) :

- **Moins de 15 ans** :
  - l'enfant n'a jamais de formulaire de lien : un bouton envoie l'email au parent (adresse masquée ensuite), un second envoi dans la minute est refusé ;
  - le parent ouvre sa page sans compte (noindex, no-referrer), choisit le prénom, reçoit le lien à l'écran et par email ;
  - un proche réserve : l'enfant voit « liste partagée », jamais le lien ni ce qui est offert ;
  - nouveau lien : l'ancien s'arrête, la réservation reste ; arrêt du partage avec confirmation ; lien parent inconnu refusé ;
  - la page du parent vit au moins aussi longtemps que le lien ; copie par email, ou la page dit qu'elle n'est pas partie.
- **Page de la famille** (`/liste/<jeton>`) :
  - sans compte, noindex, no-referrer, rien de personnel, pas de défilement horizontal sur téléphone ;
  - « Je l'offre » sur deux téléphones : l'un l'offre (focus sur le message), l'autre le voit déjà offert et sans bouton ; annulation puis reprise par l'autre ;
  - tome retiré pendant que la page est ouverte : message ; lien arrêté : « Cette liste n'est plus partagée ».
- **15 ans et plus** :
  - création du lien dans « Mes envies », lien gardé quand une autre action rafraîchit la page, lien non réaffiché ensuite, arrêt avec confirmation ;
  - le lecteur qui ouvre son propre lien ne voit rien de ce qui est offert.

## 5. Base de test cloud

Même procédure avec l'URL du pooler du projet `fcpyhtfacqnzohwzyfcp`, une compilation de production (`next build && next start -p 3200`) et `BASE=http://localhost:3200`.

## 6. Lighthouse mobile

```bash
CHROME_PATH=<chromium> npx lighthouse@12.6.0 http://localhost:3200/bibliotheque \
  --chrome-flags="--headless=new" --extra-headers=<fichier JSON avec le cookie de session> \
  --only-categories=performance,accessibility,best-practices --output=json
```

## Ce qui n'est pas testé automatiquement

- **Téléphone réel** : aucun appareil n'était disponible. Les essais « mobile » sont faits dans Chromium avec un écran de 390×844 et le tactile émulé. Ce ne sont pas des essais sur appareil.
- **Indisponibilité de MyAnimeList** : c'est un appel serveur, impossible à couper depuis le navigateur.
  - Couvert par les tests de fusion des résultats.
  - Le quota de recherche renvoie `remote_unavailable: true` quand il est atteint.
  - L'interface affiche alors « Le catalogue en ligne ne répond pas en ce moment ».
- **Connexion Google et e-mails réels** (confirmation de compte, mot de passe oublié) : ils dépendent de services externes non configurés localement.
