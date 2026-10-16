# Politique de contenu du catalogue

Trois questions distinctes, chacune avec sa propre raison. Aucune ne garantit qu'une série convient à un enfant.

## 1. Type d'œuvre (périmètre produit)

Yomushelf suit des **mangas papier**. Sont exclus de l'import automatique depuis MyAnimeList :

- romans et light novels (`novel`, `light_novel`) : ce ne sont pas des mangas ;
- doujinshi (`doujinshi`) : œuvres autoéditées, absentes des librairies françaises.

C'est un choix de produit, pas une mesure de sécurité.

Code : `malImportRefusal()` → `"type"` ([src/lib/manga-api/mal.ts](../src/lib/manga-api/mal.ts)).

## 2. Origine (périmètre de cette version)

L'import automatique accepte les mangas japonais (`manga`, `one_shot`). Les bandes dessinées coréennes, chinoises et autres (`manhwa`, `manhua`, `oel`) en sont exclues pour cette version. Cela suit la règle produit du dépôt (CLAUDE.md : « Ne pas construire : support manhwa, manhua »).

Ce n'est **pas** une mesure de sécurité, et l'origine ne dit rien de l'adéquation du contenu.

- N'importe quel lecteur peut créer une **fiche personnelle** pour une œuvre non importée.
- Le catalogue éditorial contient déjà deux séries coréennes, Solo Leveling et Omniscient Reader's Viewpoint, publiées en France dans des collections manga. Les garder ou non est une décision produit en attente.

Code : `malImportRefusal()` → `"origin"`.

## 3. Signal de contenu (protection du catalogue commun)

Un lecteur qui importe une série l'ajoute au catalogue **partagé** par tous. Pour éviter qu'un lecteur y fasse entrer du contenu sexuel :

- **accepté** : le drapeau MyAnimeList `nsfw = "white"` (aucun contenu sexuel signalé) ;
- **refusé** : `"gray"`, `"black"`, ou drapeau absent.

Le message de refus propose de créer une fiche personnelle, visible par ce lecteur seul. La recherche n'affiche déjà pas ces entrées. Le refus côté serveur couvre le cas d'un identifiant envoyé directement.

**L'absence de signal adulte ne veut pas dire « convient à un enfant ».** Une série importée reçoit donc **aucun âge**, n'est pas marquée éditoriale, et **n'apparaît jamais dans Découvrir**.

Code : `malImportRefusal()` → `"content"` et `resolveSeries()` ([src/app/(app)/ajouter/actions.ts](../src/app/(app)/ajouter/actions.ts)).

Les fiches issues d'un ISBN (Google Books) ne créent jamais de série partagée. Elles servent seulement à reconnaître une série déjà au catalogue.

## Âge : sources, champs, règles

### Champs (table `mangas`)

| Champ | Contenu |
|---|---|
| `audience_min_age` | âge minimum indiqué, ou `null` (inconnu) |
| `audience_age_source` | `cnlj` ou `estimate`, `null` si pas d'âge |
| `curated` | `true` pour les fiches écrites par le travail éditorial (migration d'enrichissement), `false` pour les imports de lecteurs |

Les lecteurs ne peuvent écrire aucun de ces champs : les droits par colonne de la migration du catalogue ne les autorisent pas.

### Sources

- **`cnlj`** (28 séries) : âge indiqué par la sélection « Manga mania ! » du CNLJ (Centre national de la littérature pour la jeunesse, BnF), relevé lors de la recherche du 2026-10-15. **À revérifier une par une avant publication** (voir la liste ci-dessous).
- **`estimate`** (57 séries) : estimation faite pendant cette même recherche. **Ce n'est pas une classification**.

### Règles de décision

| Situation | Affichage | Découvrir | Suggestions | Filtre « Âge conseillé » |
|---|---|---|---|---|
| `cnlj` | « conseillé dès N ans (CNLJ) » | oui (si éditoriale) | oui, si sous le plafond de prudence | compté |
| `estimate` | **aucun âge affiché** | oui (si éditoriale) | oui, si sous le plafond de prudence | **exclue** quand le filtre est actif |
| inconnu (`null`) | « » (rien) | **non** | **jamais** | exclue |

**Plafond de prudence des suggestions.**

- Les suggestions restent au plus 2 ans au-dessus de l'âge le plus élevé parmi les séries que le lecteur lit déjà (`comfortAge`).
- Les estimations y participent : elles ne peuvent que rendre les suggestions **plus** prudentes. Elles ne servent jamais à affirmer qu'une série convient.
- Sans aucune série lue avec un âge connu, il n'y a pas de plafond. Les séries sans âge restent exclues.

**Filtre « Âge conseillé (avis CNLJ) »** :

- Il ne retient que les séries ayant un avis CNLJ.
- L'interface précise : « C'est une indication, pas une garantie. »

Aucun écran n'emploie « âge vérifié » ou une formule de garantie.

## Séries `cnlj` à revérifier

One Piece, Naruto, Dragon Ball, L'Attaque des Titans, Demon Slayer, Jujutsu Kaisen, My Hero Academia, Spy x Family, Blue Lock, Frieren, Fairy Tail, Vinland Saga, Kingdom, Dr. Stone, The Promised Neverland, Haikyū!!, Kaguya-sama, Toilet-bound Hanako-kun, L'Atelier des sorciers, et les autres fiches marquées `cnlj` dans `supabase/migrations/20261017000100_catalogue_enrichment.sql` (requête : `select title, audience_min_age from mangas where audience_age_source = 'cnlj' order by title`).
