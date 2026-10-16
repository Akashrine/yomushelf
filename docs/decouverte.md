# Découverte et carte des goûts

Tout est calculé à partir des données réelles du lecteur et du catalogue éditorial, sans moteur d'IA. Code : `src/lib/discovery/` et `src/lib/univers/stats.ts`.

## Ce qui compte

| Signal | Poids | Nature |
|---|---|---|
| Série dont au moins un tome est lu | 1 | lecture |
| Série seulement possédée, rien de lu | 0,25 | possession (signal faible) |
| « J'ai aimé » sur une série | +1 | goût déclaré |
| « Pas pour moi » sur une série | la série ne compte plus | goût déclaré |
| Genre choisi dans « Mes goûts » | 1 par genre | goût déclaré |
| Genre évité dans « Mes goûts » | les séries de ce genre ne sont jamais proposées | préférence de contenu |

**Chaque série compte autant, qu'elle ait 3 ou 100 tomes.** Une série très longue n'écrase donc pas les autres goûts.

Une série touchant plusieurs genres répartit son poids entre eux. De même, sur la carte, elle répartit son poids entre ses territoires.

## Territoires de la carte des goûts

| Territoire | Genres |
|---|---|
| Aventure et action | action, aventure |
| Imaginaire | fantasy, surnaturel, science-fiction |
| Mystère et frissons | mystère, horreur, psychologique |
| Sport | sport |
| Rire et quotidien | comédie, tranche de vie, cuisine |
| Émotions et histoire | drame, romance, historique |

Chaque territoire affiche son niveau en mots (« Beaucoup », « Un peu », « À peine », « Pas encore »), pas seulement par la couleur.

Un clic sur un territoire ouvre :
- les séries du lecteur dans ce territoire ;
- trois découvertes du catalogue éditorial ;
- un lien vers Découvrir filtré sur ce territoire.

Les séries sans genre connu (fiches personnelles, imports) ne comptent pas, et la carte le dit.

## Découvrir

1. **Reprendre tes lectures** :
   - prochain tome chez toi, tome laissé de côté ;
   - tome à trouver (pas chez toi), avec « Je le veux ».
2. **Pour toi** :
   - séries proches de tes goûts, avec une raison tirée des données (« Parce que tu as aimé… », « Parce que tu lis… », « Parce que tu as … chez toi », « Du même auteur que… », « Parce que tu aimes … ») ;
   - « Pas pour moi » écarte une suggestion, avec annulation, et « Tout réafficher » les fait toutes revenir.
3. **Mes goûts** : genres aimés ou évités. Permet de démarrer sans historique.
4. **Explorer un univers différent** : une série par territoire peu visité.
5. **Sélections éditoriales** : tables `editorial_selections` et `editorial_selection_items`, modifiables sans déploiement.
6. **Explorer le catalogue** :
   - filtres territoire, genre, âge conseillé (avis CNLJ), parution et longueur ;
   - le filtre territoire peut arriver déjà rempli depuis la carte.

Prudence sur l'âge : voir `docs/politique-contenu.md`. Une série sans indication d'âge n'est jamais suggérée.

## Données absentes

L'ambiance n'existe pas dans le catalogue. Elle n'est donc ni utilisée ni simulée.
