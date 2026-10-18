# Mesure — Yomushelf

Mesure maison, sans cookie, dans la table `analytics_events` (Supabase, UE). Pas de Google Analytics : public mineur, pas de bandeau de consentement voulu.

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

**Activation : comptes qui ont ajouté au moins une série dans les 24 h**

```sql
with comptes as (
  select user_id, min(created_at) as t0, max(properties->>'src') as source
  from analytics_events where event_name = 'account_created' group by user_id
)
select c.source, count(*) as comptes,
  count(*) filter (where exists (
    select 1 from user_collections uc where uc.user_id = c.user_id and uc.first_added_at < c.t0 + interval '24 hours'
  )) as actives_24h
from comptes c group by 1 order by comptes desc;
```

**Rétention hebdomadaire (comptes revenus chaque semaine après l'inscription)**

```sql
with comptes as (
  select user_id, date_trunc('week', min(created_at)) as cohorte
  from analytics_events where event_name = 'account_created' group by user_id
), ouvertures as (
  select distinct user_id, date_trunc('week', created_at) as semaine
  from analytics_events where event_name = 'app_opened' and user_id is not null
)
select c.cohorte::date, count(distinct c.user_id) as comptes,
  count(distinct o.user_id) filter (where o.semaine = c.cohorte + interval '1 week') as s1,
  count(distinct o.user_id) filter (where o.semaine = c.cohorte + interval '2 weeks') as s2,
  count(distinct o.user_id) filter (where o.semaine = c.cohorte + interval '4 weeks') as s4
from comptes c left join ouvertures o using (user_id)
group by 1 order by 1 desc;
```

**Gestes clés de la semaine**

```sql
select event_name, properties - 'src' - 'path' - 'device' as detail, count(*)
from analytics_events
where created_at > now() - interval '7 days' and event_name in ('volume_toggled','fill_prompt_answered','deck_swiped','wish_added','quick_add_done')
group by 1, 2 order by 1, 3 desc;
```
