# Politique de contenu du catalogue

Trois sujets distincts : le type d'œuvre, l'origine et l'adéquation au lecteur. **Aucune règle ne garantit qu'une série convient à un enfant.** Une absence de signal adulte n'est jamais présentée comme une garantie.

## 1. Type d'œuvre (périmètre produit)

Yomushelf suit des bandes dessinées qui se lisent comme des mangas : manga, one-shot, manhwa, manhua.

Sont exclus de l'import automatique depuis MyAnimeList :
- les romans et light novels ;
- les doujinshi (autoédition).

C'est un choix de produit, pas une mesure de sécurité. Code : `malImportRefusal()` → `"type"` ([src/lib/manga-api/mal.ts](../src/lib/manga-api/mal.ts)).

## 2. Origine : jamais un motif d'exclusion

Une œuvre coréenne, chinoise ou japonaise est traitée de la même façon. Solo Leveling et Omniscient Reader's Viewpoint restent au catalogue. Leur présence dans les suggestions suit les mêmes règles de contenu que les autres séries (section 4).

`CLAUDE.md` a été mis à jour en conséquence : seul l'anime reste hors périmètre.

## 3. Protection du catalogue commun

Une série importée par un lecteur rejoint le catalogue **partagé**. Pour qu'aucun lecteur n'y fasse entrer de contenu sexuel :
- seul le drapeau MyAnimeList `nsfw = "white"` est accepté ;
- `"gray"`, `"black"` ou un drapeau absent sont refusés, et le lecteur peut créer une fiche personnelle, visible par lui seul ;
- une série importée reçoit **aucun âge**, n'est pas éditoriale et n'apparaît jamais dans Découvrir.

Une fiche venue d'un ISBN ne crée jamais de série partagée.

## 4. Âge et adéquation : seulement des informations vérifiées

### Sources (vérifiées le 2026-10-16)

| Source | Ce qu'elle couvre | Utilisation |
|---|---|---|
| **CNLJ « Manga mania ! »** (sélection annuelle du Centre national de la littérature pour la jeunesse, BnF, rédigée par La Revue des livres pour enfants) : éditions 2026 ([PDF](https://cnlj.bnf.fr/sites/default/files/bibliographies/mangamania-2026.pdf)), 2024 et 2022 | la **série entière**, classée sous « À partir de N ans » | âge vérifié de la série (`audience_age_scope = 'series'`) |
| **Catalogue BnF, critiques CNLJ de tomes** | **certains tomes**, avec une appréciation (Bravo !, Intéressant, Pourquoi pas ?…) | affiché « avis CNLJ sur les tomes … ». **Jamais étendu à la série**, jamais utilisé par les règles automatiques. |
| Estimations de la première recherche (57 séries) | rien de vérifié | **supprimées des données** (âge remis à inconnu) |

Chaque âge vérifié garde l'adresse de sa source (`audience_age_ref`). Points vérifiés à la main dans le PDF 2026, par un contrôle indépendant de celui de l'agent :
- Spy x Family sous 12 ans, Frieren sous 13, Chi sous 6, Kingdom sous 14 ;
- Fire Force et Blue Lock absents de l'édition 2026.

### Résultat pour les 28 séries marquées CNLJ auparavant

- **26 vérifiées pour la série entière.** Plusieurs âges diffèrent de l'ancienne donnée, car l'édition 2026 a relevé : My Hero Academia 11 au lieu de 9, Fairy Tail 11 au lieu de 8, Yotsuba&! 9 au lieu de 8, L'Atelier des sorciers 11 au lieu de 9.
- **Blue Lock** (« Blue lock », sous « À partir de 11 ans », éditions 2022, 2023 et 2024) et **Boruto** (« Boruto : Naruto next generations », sous « À partir de 9 ans », édition 2022 seulement) ne figurent plus dans la sélection 2026. Leur référence est gardée : vérifiée dans le PDF, datée, et associée à la bonne œuvre. L'absence de la sélection 2026 ne vaut pas retrait. L'âge s'affiche avec l'année de la sélection, par exemple « dès 11 ans (sélection CNLJ 2024) ».
- **Fire Force** : seulement des critiques de tomes (11 ou 13 ans selon le tome), donc âge **inconnu** pour la série.
- **Gunnm** : l'entrée CNLJ porte sur *Gunnm : Mars Chronicle*, pas sur la série originale, donc âge **inconnu**.
- Des critiques de tomes contredisent parfois l'âge de la série : L'Attaque des Titans 15 ans pour certains tomes contre 14 pour la série, Beastars 15 contre 13, Spy x Family 11 contre 12. On garde l'âge de la sélection, qui couvre la série.
- **Hors des 28** :
  - Solo Leveling : critiques des tomes 1 à 4, dès 13 ans, « Pourquoi pas ? » puis « Bravo ! » ;
  - Omniscient Reader's Viewpoint : tomes 1 et 3, dès 15 ans, « Pourquoi pas ? ».
  - Les deux sont affichés comme avis sur des tomes.

### Règles de décision (code : `verifiedAge`, `contentAllowed`, `ageLabel` dans [src/lib/discovery/suggest.ts](../src/lib/discovery/suggest.ts))

| Règle | Effet |
|---|---|
| Âge affiché | « dès N ans (sélection CNLJ AAAA) » pour une série présente dans une sélection, avec l'année de l'édition. « avis CNLJ sur le tome … » pour une critique de tomes. Sinon « âge non vérifié ». Une sélection est une indication datée, pas une classification officielle ni une garantie. |
| Filtre « Âge conseillé (avis CNLJ) » | ne retient que les séries avec un âge vérifié pour la série entière |
| Plafond de prudence des suggestions | si le lecteur a lu des séries à âge vérifié : au plus 2 ans au-dessus du plus élevé. Sinon, pas de plafond. |
| Âge inconnu | proposable, avec la mention « âge non vérifié » |
| Magazines pour jeunes adultes (seinen, josei) sans âge vérifié | proposés seulement à un lecteur qui lit ou a aimé une série de ce public. Donnée descriptive du catalogue, pas une classification. |
| Genres évités par le lecteur | jamais proposés |
| Mode « Seulement des séries recommandées pour la jeunesse » (réglage du lecteur dans « Mes goûts ») | seules les séries avec un âge CNLJ vérifié pour la série entière sont proposées |

Ces règles s'appliquent aux suggestions, à « Explorer un univers différent » et aux découvertes de la carte des goûts. La navigation dans le catalogue avec filtres reste ouverte.

### Effet concret sur le catalogue éditorial (85 séries)

| Ensemble | Séries |
|---|---|
| Âge CNLJ vérifié pour la série entière | 26 : 6 dès 9 ans au plus, 14 dès 11 ans au plus, 24 dès 13 ans au plus |
| Avis CNLJ sur des tomes seulement | 2 |
| Âge non vérifié | 57 |
| Proposables en mode « tout le catalogue » à un lecteur qui ne lit pas de seinen ni de josei | 71 |
| Retenues pour ce lecteur (seinen ou josei sans âge vérifié) | 14 |
| Proposables en mode « jeunesse » | 26, moins celles au-dessus du plafond de prudence |

L'application reste utile, mais **la prudence repose sur des données limitées**. Les âges vérifiés couvrent 26 séries sur 85. Le public visé (shōnen, seinen…) vient de la première recherche et n'a pas été revérifié série par série.
