# Décisions produit

Ce document est suivi par Git. `CLAUDE.md` est ignoré par le dépôt, donc ses mises à jour locales ne sont pas partagées. Les décisions qui font foi sont ici. Chaque ligne renvoie au document détaillé.

## Périmètre

| Décision | Date | Détail |
|---|---|---|
| Trois espaces : « Ma bibliothèque », « Découvrir », « Mon univers » | 2026-10 | [cahier-des-charges-suivi.md](cahier-des-charges-suivi.md) |
| Possession et lecture restent indépendantes : on peut lire sans posséder, posséder sans lire | 2026-10 | [cahier-des-charges-suivi.md](cahier-des-charges-suivi.md) |
| Les manga, one-shots, manhwa et manhua sont suivis. L'origine n'est jamais un motif d'exclusion. | 2026-10-16 | [politique-contenu.md](politique-contenu.md) §2 |
| Les romans, light novels et doujinshi ne sont pas importés depuis MyAnimeList. C'est un choix de produit, pas de sécurité. | 2026-10-16 | [politique-contenu.md](politique-contenu.md) §1 |
| L'anime reste hors périmètre | 2026-10-16 | — |
| Hors périmètre du MVP : lecteur de chapitres, app native, social, alertes de sortie actives, paiement, marketplace, imports concurrents, prix en temps réel | avant 2026-10 | spécification initiale |

## Contenu et âge

| Décision | Date | Détail |
|---|---|---|
| Seuls les âges vérifiés sont affichés : sélection CNLJ « Manga mania ! » pour une série entière, avec l'année de la sélection. Les critiques de tomes s'affichent comme avis sur des tomes, jamais étendues à la série. | 2026-10-16 | [politique-contenu.md](politique-contenu.md) §4 |
| Les estimations d'âge non sourcées sont supprimées. Sans source, la mention est « âge non vérifié ». | 2026-10-16 | idem |
| Blue Lock (sélection 2024) et Boruto (sélection 2022) gardent leur âge, daté. L'absence de la sélection 2026 ne vaut pas retrait. | 2026-10-16 | idem |
| Aucune règle ne garantit qu'une série convient à un enfant. Le mode « jeunesse » ne propose que des séries à âge CNLJ vérifié. | 2026-10-16 | idem |
| Une série importée par un lecteur rejoint le catalogue partagé seulement avec le drapeau MyAnimeList `white`. Sinon, la fiche est personnelle. | 2026-10 | idem §3 |

## Données et vie privée

| Décision | Date | Détail |
|---|---|---|
| Les bibliothèques sont privées par défaut | 2026-10 | migration `20261017000400_private_libraries` |
| Les jaquettes sont stockées dans Supabase Storage (2 Mo maximum, JPEG, PNG ou WebP), jamais liées directement depuis la source | 2026-10 | migration `20261017000800_cover_storage` |

## Exploitation

| Décision | Date | Détail |
|---|---|---|
| Publication en courte maintenance, en deux couches : page 503 dans l'application et gel des écritures en base | 2026-10-16 | [publication.md](publication.md) |
| Le retour arrière doit restaurer les valeurs exactes de la configuration Auth sauvegardée (modèles, sujets, URL), pas les valeurs par défaut | 2026-10-16 | idem |
| Ouverture publique seulement avec un serveur SMTP qui envoie à toute adresse. Le service intégré de Supabase, réservé à l'équipe, ne suffit pas. | 2026-10-16 | idem |
| La connexion Google n'est jamais retirée sans en parler. Sans contrôle du propriétaire, la maintenance reste en place. | 2026-10-16 | idem |
| L'import nocturne (cron) reste désactivé. L'activer demande un accord séparé. | 2026-10-16 | idem, « Opérations séparées » |
| La fusion des doublons de production (Naruto, One Piece, Gunnm) est une opération séparée, avec un accord séparé, simulation d'abord | 2026-10-16 | idem et [rapports/fusion-doublons-base-de-test.md](rapports/fusion-doublons-base-de-test.md) |
| Après la réouverture, on corrige en avant. Le retour arrière n'est prévu qu'avant la réouverture. | 2026-10-16 | idem |
