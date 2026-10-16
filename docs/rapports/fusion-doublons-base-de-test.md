# Fusion des doublons — base de test (yomushelf-preview)

Date : 2026-10-16. Base : projet de test `fcpyhtfacqnzohwzyfcp`. **Aucune fusion en production.**

## Paires détectées (`catalogue_duplicate_candidates()`)

| Conservée (fiche éditoriale) | Fusionnée (import MyAnimeList) |
|---|---|
| One Piece `021acb54…` | One Piece `666457e0…` (mal_id 13) |
| Naruto `816eef59…` | Naruto `feab0410…` (mal_id 11) |
| Fullmetal Alchemist `f4918a38…` | Fullmetal Alchemist `335af81f…` (mal_id 25) |

## Simulation (`catalogue_merge(keep, drop)`, sans application)

| Série | Contradictions | Lignes identiques à combiner | Lignes à déplacer | Comptes concernés |
|---|---|---|---|---|
| One Piece | 0 | 28 (14 tomes, 12 lectures, 1 envie, 1 série en bibliothèque : valeurs identiques des deux côtés) | 37 | 1 (demo) |
| Naruto | 0 | 1 (série présente des deux côtés dans la bibliothèque) | 0 | 1 (legacy) |
| Fullmetal Alchemist | 0 | 0 | 0 | 0 |

## Application sur la base de test

| Compte | Avant (lignes tomes / lectures / envies / payé) | Après |
|---|---|---|
| demo@yomushelf.local | 57 / 47 / 5 / 386,49 € (14 tomes comptés deux fois) | 43 / 35 / 4 / 285,69 € |
| legacy@yomushelf.local | 172 / 87 / 0 / 0 € | 172 / 87 / 0 / 0 € |

- 43 tomes distincts avant comme après : aucune possession perdue.
- Le total payé passe de 386,49 € à 285,69 € : les 14 tomes en double (7,20 € chacun) étaient comptés deux fois.
- Plus aucune paire candidate. Rejouer la fusion renvoie `already_merged`.
- Les fiches fusionnées restent en base, marquées `merged_into`, absentes de la recherche.
