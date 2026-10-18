# Plan de distribution — Yomushelf

Rédigé le 18/10/2026, à partir d'une recherche sur les concurrents, les canaux et créateurs manga FR, les lieux physiques et les leviers de croissance, relue par une contre-expertise. Les liens de campagne et les requêtes de suivi sont dans `docs/analytics.md`.

## En une phrase

**La seule app de collection manga pensée pour les enfants et leurs parents** : gratuite, sans pub, sans profil public, avec des âges conseillés issus de la sélection jeunesse de la BnF. On la fait connaître d'abord **par les adultes qui entourent les 9-15 ans** (parents, libraires, bibliothécaires, profs-docs), pas par les réseaux sociaux.

## Pourquoi ce positionnement tient

| Concurrent | Ce qu'il est | La faille pour nous |
|---|---|---|
| Mangacollec | Leader FR, ~1,9k notes App Store | Classé **16+**, contient de la **pub**, outil de liste pour collectionneurs adultes |
| Bubble BD | BD + manga, 9+ | Pub, abonnement payant, généraliste BD |
| Myutaku | Manga + anime | Dense, orienté anime et calendrier, pas pour un enfant |
| Gleeph / Babelio | Réseaux sociaux de lecteurs | Profils publics et fil social : ce que les parents d'un enfant de 9 ans veulent éviter |
| Nautiljon / Manga-News | Bases de données | Interface adulte, pas mobile, pas « ce qui me manque » |

**Personne ne vise les 9-15 ans et leurs parents.** Aucun ne propose d'âges conseillés ni une découverte en jeu. C'est notre créneau. On ne va **pas** chercher les collectionneurs adultes de Mangacollec de front.

## La contrainte qui décide de tout

La cible principale a souvent moins de 13 ans, l'âge minimum de TikTok, Instagram et Discord. La publicité profilée vers les mineurs est interdite (DSA), et en France le consentement d'un parent est requis sous 15 ans (RGPD). Donc :

- on touche les **9-12 ans par des adultes** : parents, libraires, médiathèques, CDI, salons ;
- on touche les **13-25 ans** sur les réseaux, sans jamais montrer d'enfant ni contacter un mineur en privé ;
- **aucun concours** qui collecte des données d'enfants, **aucun Discord** ouvert aux enfants.

## À faire avant d'aller chercher du monde (semaines 1-3)

Sans ça, chaque visiteur amené est perdu ou nous expose.

1. **Mettre la mesure en prod** (PR #22 + migration) : sans elle, impossible de savoir quel canal marche.
2. **Parcours de consentement parental sous 15 ans** (RGPD, art. 45 de la loi Informatique et Libertés). Les écoles et médiathèques le demanderont en premier.
3. **Filtrer les couvertures par âge** dans Découvrir et les sélections. Un parent qui tombe sur une couverture seinen dans une app « famille » ne revient pas.
4. **Une question à l'inscription** : « Comment tu as connu Yomushelf ? ». Le bouche-à-oreille arrive en « direct » dans la mesure, et c'est elle qui le révèle.
5. **Définir un compte actif** : a ajouté ou modifié un tome dans la semaine (requête « rétention réelle » de `docs/analytics.md`).

## Le produit au service de la distribution

Ces fonctionnalités sont des canaux en elles-mêmes, par ordre de priorité.

| Fonction | Pourquoi | Quand |
|---|---|---|
| **Liste de Noël / anniversaire partageable** (lien privé créé par le parent, révocable, qui expire, sans nom de famille, sans collection complète) | Les grands-parents demandent « qu'est-ce qu'il veut ? » et achètent des doublons. Chaque destinataire est un adulte, souvent parent lui-même. | **En ligne vers le 15 novembre** |
| **Image « ma collection »** générée sur l'appareil (pas de page publique, filigrane yomushelf.com) | Le bouche-à-oreille de cour d'école et des groupes WhatsApp familiaux, sans profil public | Décembre (« Mon année manga ») |
| **Invitation à installer la PWA** après un moment utile (1re série ajoutée), avec un guide iOS | L'icône sur l'écran d'accueil fait revenir | Novembre |
| **Emails au parent** (Resend) : J0 « ajoute 3 séries », J3 « coche ce que tu as », fin novembre « prépare ta liste » | Réactivation aux moments d'achat | Novembre |
| **Pages publiques par série** (âge conseillé, nombre de tomes, « si tu aimes, essaie ») + pages « mangas pour 9-12 ans » | Référencement Google sur les questions des parents | Mi-décembre, pour un effet au **printemps 2027** (pas Noël 2026) |

## Calendrier des 90 jours (18 octobre → mi-janvier)

**3 canaux principaux, pas 10** : parents (Noël), local physique, prescripteurs (bibliothèques et CDI). Tout canal sans signal au **jour 45** s'arrête.

### Fin octobre – début novembre : préparer

- Faire les points de la section « avant d'aller chercher du monde ».
- Imprimer un **kit QR** (flyers, marque-pages et affiche A4 au style manga, environ 50 €), **un lien de campagne par lieu** (`?utm_source=librairie_<nom>`, `mediatheque_<ville>`, `ecole`, `slpj2026`…).
- Préparer une **fiche d'une page** pour les bibliothécaires et profs-docs : usage en club manga, âges selon la sélection CNLJ, sans pub ni profil public.
- Écrire à la **CNLJ / BnF** : présenter l'usage non commercial, demander l'autorisation de citer la sélection « Manga mania ». **Ne jamais écrire « validé par la BnF »** tant qu'il n'y a pas d'accord.

### Novembre : la boucle locale et la liste de Noël

- **5 librairies manga** autour de chez toi : un présentoir QR au comptoir « Tu sais quels tomes il te manque ? ». Le libraire y gagne, puisqu'un client qui arrive avec sa liste ne rapporte pas de doublon.
- **Ta médiathèque** : un atelier d'une heure, le jeu des cartes sur grand écran, chacun repart avec sa liste d'envies. Ton fils est l'ambassadeur.
- **L'école ou le CDI de ton fils** : la fiche d'une page, un club manga si possible.
- **Salon du livre et de la presse jeunesse, Montreuil (25-30 novembre)**, en visiteur : stand CNLJ/BnF, bibliothécaires jeunesse, profs-docs. L'objectif est de **récolter des contacts**, pas des inscriptions.
- **Groupes Facebook de parents** (avec l'accord des modérateurs) et **groupes WhatsApp de l'école**, à partir du 20 novembre : « Mon fils de 9 ans rachetait des tomes en double, j'ai fait ça, et maintenant sa liste de Noël tient dans un lien. »
- **Presse parents** pour les guides de Noël (Magicmaman, qui a absorbé famili ; Parents.fr) : angle « offrir des mangas sans se tromper », avec 2 ou 3 conseils par âge tirés de la sélection CNLJ.
- **Un post Reddit r/france** (une seule fois, soigné, avec la démo sans compte).
- Si l'un des deux est près de chez toi : **Japan Touch Lyon** ou le **Toulouse Game Show** (28-29 novembre), en visiteur avec une tablette et la démo.

### Décembre : pousser Noël

- Relancer la liste de Noël dans tous les canaux ouverts en novembre.
- Lancer l'image « Mon année manga » la première semaine.
- **Presse régionale** (le quotidien de ta ville) : l'histoire père-fils convertit le mieux localement.

### Janvier : mesurer et préparer la suite

- Faire le bilan par source (requêtes de `docs/analytics.md`). Couper ce qui ne marche pas, doubler ce qui marche.
- **Communiqué presse** sur le bilan annuel du marché manga (NielsenIQ, janvier). L'angle : un marché qui recule (-13 % en 2025), et des familles qui achètent plus malin.
- Préparer **Angoulême** (premier trimestre 2027, dates à confirmer) : accréditation, kit presse d'une page, rencontre des attachés de presse jeunesse de Kana, Glénat, Pika et Ki-oon. Un partenariat de contenu réglerait aussi la question des droits sur les couvertures.

## Après les 90 jours, si la rétention tient

| Quand | Quoi |
|---|---|
| Février | Écrire personnellement à **10-15 micro-YouTubeurs manga** (5k-50k abonnés, par exemple Mangactu) : accès anticipé, collection pré-remplie, lien suivi. |
| Mars | **Paris Manga** (Villepinte), en visiteur, pour des tests utilisateurs. Démarcher les médiathèques pour **Partir en Livre** (mi-juin à mi-juillet). |
| Printemps | Les pages par série commencent à remonter dans Google. Ajouter des pages « mangas par âge ». |
| 8-11 juillet 2027 | **Japan Expo**, l'objectif à 9 mois : 222 000 visiteurs, un QR par jour, des démos de 20 secondes. Pas de stand payant. |
| Rentrée 2027 | **Prix manga scolaires** (Manga Academia, Mangawa…) : les inscriptions se font fin septembre. Proposer un module « suis la sélection du prix ». |
| Après traction | Gros créateurs (LeChefOtaku, Manga Trash, Mademoiselle Soso), Fnac et Cultura au niveau national. |

## Ce qu'on ne fait pas (ou pas maintenant)

- **Les stands payants et les gros créateurs sponsorisés** avant d'avoir prouvé la rétention : un pic de trafic sur un entonnoir qui fuit, c'est de l'argent perdu.
- **TikTok comme canal principal.** Au plus **un clip par semaine**, recyclé sur Instagram et Shorts (une session de swipe, « il me manque 7 tomes »). Rien ne prouve qu'une capture d'écran d'app utilitaire convertisse, et c'est le plus gros mangeur de temps.
- **Product Hunt, Maddyness, r/manga (anglophone)** : ce n'est pas notre public.
- **Le pass Culture** : une app gratuite n'est pas une offre réservable, et la part des 15-16 ans a été supprimée.
- Tout ce qui vise directement les enfants en ligne, comme dit plus haut.

## Objectifs (hypothèses à corriger avec les vrais chiffres)

| Échéance | Comptes créés | Actifs à 4 semaines |
|---|---|---|
| Mi-janvier 2027 | 300 | 100 |
| Avant Japan Expo (juillet 2027) | 1 000 | 350 |
| Fin 2027 | 10 000 | à définir après le premier semestre |

Indicateurs à suivre chaque semaine :
- visites de la landing → swipes de la démo → inscriptions, par source ;
- part des nouveaux comptes qui ajoutent une série dans les 24 h ;
- comptes actifs à 1 et 4 semaines.

## Risques à garder en tête

- **Droits.** Afficher publiquement les couvertures des éditeurs (pages par série, presse) et récupérer des données sur Nautiljon exposent davantage à mesure qu'on grandit. Un partenariat éditeur ou des visuels autorisés seraient la vraie réponse.
- **La caution CNLJ** est notre meilleur argument, à condition de la citer correctement.
- **Les réponses des IA** (ChatGPT, résumés de Google) prennent les questions « combien de tomes ». Il faut viser celles où nous avons quelque chose de mieux à dire : l'âge, et les questions de parents.
- **Ton temps.** 3 canaux à la fois, pas plus. On arrête un canal muet au jour 45.
