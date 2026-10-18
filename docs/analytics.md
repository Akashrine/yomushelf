# Mesure — Yomushelf

Mesure maison, sans cookie, dans la table `analytics_events` (Supabase, UE). Pas de Google Analytics : public mineur, pas de bandeau de consentement voulu. Conçue pour rester dans l'exemption CNIL « mesure d'audience » :

- **aucun événement n'est rattaché à une personne** : `user_id` toujours vide, pas d'identifiant de visiteur, pas d'IP ;
- un compte connecté ajoute seulement `cohort` (semaine de création du compte, ex. `2026-W42`) ;
- **refus possible** (interrupteur sur /confidentialite, et Do Not Track / Global Privacy Control respectés) ;
- **conservation 13 mois** (cron nocturne `/api/cron/analytics-purge`) ;
- **écriture serveur uniquement** : `anon`/`authenticated` n'ont plus le droit d'insérer (migration `20261018000200`), plafond de 60 événements par minute et par client dans `/api/events`.

- **Catalogue** : `src/lib/analytics-catalogue.ts`. Un événement ou une propriété absents du catalogue sont refusés par `/api/events`.
- **Côté navigateur** : `track()` dans `src/lib/analytics.ts` (envoi groupé, `sendBeacon`).
- **Côté serveur** : `logServerEvent()` dans `src/lib/server/analytics.ts` (création de compte, confirmation d'email).
- **Contexte ajouté à chaque événement** : `src` (source de la visite : `utm_source`, sinon site référent, sinon `direct`), `path` (route sans identifiant), `device` (`mobile`/`desktop`).
- **Jamais** : texte tapé, titre recherché, IP, identifiant de visiteur anonyme.
- **Pages vues et référents** : Vercel Analytics (tableau de bord Vercel).

## Liens de campagne

Ajouter `?utm_source=<canal>` à chaque lien posté : `tiktok`, `instagram`, `youtube`, `discord`, `reddit`, `flyer`, `ecole`, `librairie`, `presse`, `parrainage`… (minuscules, sans espace). Exemple : `https://www.yomushelf.com/?utm_source=tiktok`. Pour une campagne précise : `?utm_source=tiktok_onepiece`.

## Événements

| Événement | Où | Propriétés |
|---|---|---|
| `landing_viewed` | Landing | — |
| `landing_cta_clicked` | Landing | `position` : hero, deck_end, final |
| `demo_swiped` / `demo_completed` | Démo du jeu (landing) | `choice` / `wishes` |
| `signup_viewed` | Page d'inscription | — |
| `account_created` | Serveur | `method` : email, google (+ `src`) |
| `email_confirmed` | Serveur | — |
| `app_opened` | 1 fois par session dans l'app | `screen` |
| `quick_add_done` | Ajout rapide terminé | `series`, `volumes`, `welcome` |
| `volume_toggled` | Fiche série | `action` add/remove, `tab` tomes/lectures |
| `fill_prompt_answered` | Bulle « Tu as aussi… ? » | `answer` yes/no, `tab`, `volumes` |
| `series_viewed` | Fiche série | `presence` on_shelf/archived/absent |
| `wish_added` | Envie ajoutée | `from` serie, decouvrir_hero |
| `deck_opened` / `deck_swiped` | Jeu des cartes (app) | `choice` wish/pass/skip |
| `discover_filtered` / `discover_searched` | Découvrir | `age` / — |
| `pictures_opened` / `similar_clicked` | Fiche série | — |

## Requêtes (SQL editor Supabase, prod)

**Entonnoir par source, 30 derniers jours**

```sql
select coalesce(properties->>'src','direct') as source,
  count(*) filter (where event_name = 'landing_viewed')        as visites_landing,
  count(*) filter (where event_name = 'demo_swiped')           as swipes_demo,
  count(*) filter (where event_name = 'landing_cta_clicked')   as clics_cta,
  count(*) filter (where event_name = 'signup_viewed')         as vues_inscription,
  count(*) filter (where event_name = 'account_created')       as comptes_crees
from analytics_events
where created_at > now() - interval '30 days'
group by 1 order by comptes_crees desc, visites_landing desc;
```

**Activation par source : comptes créés vs premières séries ajoutées (ajout rapide de bienvenue)**

```sql
select coalesce(properties->>'src','direct') as source,
  count(*) filter (where event_name = 'account_created') as comptes,
  count(*) filter (where event_name = 'quick_add_done' and (properties->>'welcome')::boolean) as premieres_series
from analytics_events
where created_at > now() - interval '30 days'
group by 1 order by comptes desc;
```

**Rétention par cohorte (visites dans l'app par semaine, rapportées à la taille de la cohorte)**

Ce sont des visites, pas des personnes : un même compte peut compter plusieurs fois. À lire comme une tendance.

```sql
with cohortes as (
  select properties->>'cohort' as cohorte, count(*) as comptes
  from analytics_events where event_name = 'account_created' group by 1
), visites as (
  select properties->>'cohort' as cohorte, date_trunc('week', created_at)::date as semaine, count(*) as visites
  from analytics_events where event_name = 'app_opened' and properties ? 'cohort' group by 1, 2
)
select v.cohorte, c.comptes, v.semaine, v.visites, round(v.visites::numeric / nullif(c.comptes, 0), 2) as visites_par_compte
from visites v left join cohortes c using (cohorte)
order by v.cohorte desc, v.semaine;
```

**Rétention réelle par personne (données du service, pas de la mesure)**

Comptes actifs = qui ont ajouté ou changé un tome, une lecture ou une série la semaine donnée.

```sql
with comptes as (select id, date_trunc('week', created_at) as cohorte from profiles),
actifs as (
  select user_id, date_trunc('week', updated_at) as semaine from user_volumes
  union select user_id, date_trunc('week', updated_at) from user_readings
  union select user_id, date_trunc('week', updated_at) from user_collections
)
select c.cohorte::date, count(*) as comptes,
  count(distinct a.user_id) filter (where a.semaine = c.cohorte + interval '1 week') as s1,
  count(distinct a.user_id) filter (where a.semaine = c.cohorte + interval '4 weeks') as s4
from comptes c left join actifs a on a.user_id = c.id
group by 1 order by 1 desc;
```

**Gestes clés de la semaine**

```sql
select event_name, properties - 'src' - 'path' - 'device' as detail, count(*)
from analytics_events
where created_at > now() - interval '7 days' and event_name in ('volume_toggled','fill_prompt_answered','deck_swiped','wish_added','quick_add_done')
group by 1, 2 order by 1, 3 desc;
```
