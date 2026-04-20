# Yomushelf — Context for Claude Code

## What this project is

PWA française pour suivre sa collection physique de mangas : possession, lecture, budget. Cible : collectionneurs FR qui achètent en librairie et perdent le fil de leurs séries (40 sorties par semaine à 7,50€, séries de 40+ tomes, multi-séries en parallèle). Projet solo, pre-launch, stack Next.js + Supabase. Objectif MVP : valider la demande via waitlist puis onboarding + bibliothèque visuelle + scan ISBN.

## Stack

- Frontend : Next.js 14 (App Router), React Server Components
- PWA : next-pwa, manifest, service worker
- CSS : Tailwind CSS v4
- Language : TypeScript strict
- Base de données : Supabase Postgres (région EU, Frankfurt ou Paris)
- Auth : Supabase Auth (email/password + Google OAuth)
- Storage : Supabase Storage (jaquettes cachées localement)
- Email : Resend (waitlist double opt-in, confirmations)
- Analytics : Plausible (anonyme) + table `analytics_events` Supabase (user-scoped)
- Rate limiting : Upstash Ratelimit
- Scan : @zxing/browser (ISBN via caméra PWA)
- Déploiement : Vercel (région CDG)
- Cron : Vercel Cron (ingestion nocturne APIs tierces)

## Current state

### Pages à construire (aucune live pour l'instant)

- `/` → Landing pre-launch, capture waitlist (SSG avec re-val 60s)
- `/login` → Connexion email/password ou Google OAuth (Client)
- `/signup` → Inscription (Client)
- `/auth/callback` → Callback OAuth Google (Route Handler)
- `/onboarding/[step]` → Steps 1, 2, 3 de l'onboarding top 50 FR (Client hybride)
- `/bibliotheque` → Vue visuelle de la collection, killer feature (SSR + Client filtres)
- `/bibliotheque/[seriesSlug]` → Détail série (tomes, lecture, budget restant)
- `/ajouter/scan` → Scan code-barres caméra PWA (Client)
- `/ajouter/manuel` → Recherche manuelle et ajout tome (Client)
- `/profil` → Identité, stats, settings, logout (SSR)
- `/api/waitlist` → Route Handler POST insert waitlist
- `/api/waitlist/count` → Route Handler GET compteur waitlist (cache 60s)
- `/api/cron/ingest-mangas` → Cron nocturne ingestion APIs tierces

### What works

Rien. Projet from scratch. Spec technique complète disponible (06.A + 06.B).

### What's missing

Tout. Voir "What needs to be built next".

## Key files (do not break)

Projet from scratch, pas de fichiers protégés à ce stade. Une fois le setup initial fait, les fichiers suivants deviendront critiques à ne pas casser sans revue :

- `lib/types/database.ts` — types miroirs Supabase, source de vérité des entités
- `lib/supabase/server.ts` — client Supabase Server Components
- `lib/supabase/client.ts` — client Supabase Browser
- `lib/supabase/middleware.ts` — refresh session
- `middleware.ts` — protection routes `/bibliotheque`, `/onboarding`, `/profil`, `/ajouter`
- `supabase/migrations/` — source de vérité schéma DB, ne jamais éditer à la main une migration déjà appliquée
- `supabase/seeds/top_50_fr.sql` — seed onboarding, requis pour US-3
- `docs/design.md` — design system exporté Stitch, source de vérité visuelle

## Data model

```typescript
type Profile = {
  id: string // = auth.users.id
  username: string | null
  email: string // unique, not null
  created_at: Date
  onboarding_completed: boolean // default false
  avatar_initials: string // dérivé de username, 2 chars max
}

type Manga = {
  id: string // uuid
  title: string // not null
  author: string | null
  publisher_fr: string | null // "Glenat", "Kana", "Ki-oon", "Panini", "Pika"
  total_volumes: number | null // null = ongoing
  status: 'ongoing' | 'completed' | 'paused'
  avg_price_eur: number // default 7.50
  genre_primary: string | null
  cover_url: string | null
  external_ids: { mangahook_id?: string; nautiljon_slug?: string }
  is_top_50_fr: boolean // default false
  top_50_rank: number | null // 1-50 si is_top_50_fr
  created_at: Date
  updated_at: Date
}

type Volume = {
  id: string
  manga_id: string // FK Manga.id
  volume_number: number // not null
  isbn_13: string | null // unique si not null, clé pour scan
  release_date_fr: Date | null
  price_eur: number | null // fallback Manga.avg_price_eur si null
  cover_url: string | null
  edition: 'standard' | 'double' | 'perfect' | 'collector'
  created_at: Date
}
// Unique : (manga_id, volume_number, edition)

type UserCollection = {
  id: string
  user_id: string // FK Profile.id
  manga_id: string // FK Manga.id
  owned_volumes: number[] // array de volume_number
  last_read_volume: number | null // 0 = pas commencé
  status: 'not_started' | 'reading' | 'caught_up' | 'completed' | 'dropped'
  first_added_at: Date
  updated_at: Date
}
// Unique : (user_id, manga_id)

type WaitlistEntry = {
  id: string
  email: string // unique
  source: 'landing_hero' | 'landing_footer' | 'tiktok_campaign' | 'other'
  created_at: Date
  confirmed: boolean // default false, double opt-in
}

type AnalyticsEvent = {
  id: string
  user_id: string | null
  event_name: string
  properties: Record<string, unknown>
  created_at: Date
}
```

RLS (Row Level Security) obligatoire :
- `profiles` : read/update self only
- `user_collections` : CRUD self only
- `mangas`, `volumes` : read public, write service role
- `waitlist_entries` : insert public anonyme, read service role
- `analytics_events` : insert self, read service role

## Design system

Voir `docs/design.md` exporté depuis Stitch.

Résumé des tokens :
- Background : dark near-black warm tint
- Accent : deep warm red/orange (crimson-leaning, pas rouge drapeau JP)
- Typography : sans-serif moderne (Inter ou Geist), bold titles, line-height généreuse
- Border-radius : 8-12px, jamais sharp, jamais pill
- Spacing : airy, rhythm vertical généreux
- Manga covers : jaquettes réelles FR récentes (Chainsaw Man, JJK, One Piece, Spy x Family, Blue Lock, Kaiju No 8, Frieren, Solo Leveling, etc.)
- Détail japonais : subtil, 1 max (kanji logo type 漫 ou 棚)

## Integrations

### Supabase
- Usage : DB, Auth, Storage, RLS
- Config : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Lib : `@supabase/ssr`

### Resend
- Usage : emails transactionnels (double opt-in waitlist, confirmation compte, reset password)
- Config : `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

### Plausible
- Usage : analytics web anonymes (funnel, rétention, sources)
- Config : `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`

### Upstash Ratelimit
- Usage : rate limit waitlist (3/min/IP), lookupIsbn (30/min/user)
- Config : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### mangahook-api
- Usage : source 1 base mangas FR
- Endpoint : https://mangahook-api.vercel.app/
- Ingestion : job cron nocturne, cache local Supabase

### nautiljon-scraper
- Usage : source 2 base mangas FR + ISBN
- Config : `NAUTILJON_SCRAPER_URL` (self-hosted ou via repo barthofu)

### Vercel Cron
- Usage : déclenche `/api/cron/ingest-mangas` quotidien
- Config : `vercel.json`, `CRON_SECRET`

## What needs to be built next

Ordre NON-NÉGOCIABLE. Ne pas coder d'UI avant que les données et API soient prêtes.

1. Setup projet + layout + config (Next.js, Tailwind v4, next-pwa, polices, manifest, metadata, région Vercel CDG)
2. Schéma de données + migrations Supabase + RLS + RPCs (`getUserStats`, `getWaitlistCount`) + seed `top_50_fr.sql` + types générés
3. Server Actions et Route Handlers :
   - `joinWaitlist`
   - `upsertOnboardingSelection`
   - `addVolumeToCollection`
   - `lookupIsbn`
   - `updateReadingProgress`
   - `/api/cron/ingest-mangas`
4. Pages et composants dans cet ordre :
   - 4a. Landing `/` (US-1, valide riskiest assumption)
   - 4b. Login + signup + auth callback + middleware (US-2)
   - 4c. Onboarding `/onboarding/[step]` (US-3)
   - 4d. Bibliothèque `/bibliotheque` (US-4, US-7, killer feature)
   - 4e. Page série `/bibliotheque/[seriesSlug]` (US-4, US-6)
   - 4f. Scan + ajout manuel `/ajouter/scan`, `/ajouter/manuel` (US-5, précédé d'un spike technique caméra iOS Safari en S1)
   - 4g. Profil `/profil` (transverse)
5. Intégrations : Supabase Auth (email + Google OAuth), Resend templates, Plausible, Upstash
6. SEO + PWA : sitemap, robots, JSON-LD, OG tags, test installabilité iOS + Android
7. Events analytics : instrumentation des 11 events (waitlist_signup, signup_completed, onboarding_*, volume_added, scan_*, bibliotheque_viewed, session_start)
8. Audit Lighthouse, scroll bibliothèque 200 tomes, scan iOS Safari réel, WCAG AA

Principe : DONNÉES → API → INTERFACE. Jamais l'inverse.

## Architecture decisions

- Next.js App Router avec groupes de routes `(public)` et `(app)` pour séparer routes ouvertes et routes authentifiées.
- Server Components par défaut, Client Components uniquement pour interactions (filtres bibliothèque, formulaires, scanner).
- Server Actions préférées aux Route Handlers sauf pour webhooks, crons, et endpoints publics cacheables.
- Supabase RLS obligatoire sur toutes les tables user-scoped, jamais de bypass côté client.
- Jaquettes mangas stockées en Supabase Storage après ingestion (pas de hotlink APIs tierces, protège contre les pannes).
- Virtualisation scroll obligatoire sur `/bibliotheque` dès 50 tomes (react-window ou équivalent).
- PWA offline minimal : shell + manifest, pas de sync complexe au MVP.
- Budget calculé côté serveur via RPC SQL (source : `owned_volumes` × prix, fallback `avg_price_eur = 7.50`).
- Dates et prix stockés en UTC / EUR, formatage côté affichage via Intl.

## Code conventions

- Variables, commentaires, noms de fonctions : anglais
- Contenu user-facing (labels, messages, emails, SEO metadata) : français uniquement
- Noms de types : PascalCase singulier (`UserCollection`, pas `UserCollections`)
- Noms de tables Supabase : snake_case pluriel (`user_collections`, `waitlist_entries`)
- Server Actions : fichiers `actions.ts` colocalisés avec la feature
- Composants : PascalCase, 1 composant par fichier, fichier kebab-case (`series-strip.tsx` exporte `SeriesStrip`)
- Imports : `@/` alias pour racine projet
- Validation : zod sur toutes les entrées Server Actions et Route Handlers
- Tests : pas au MVP sauf pour les helpers budget et parsing ISBN
- Commits : conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)

## Rules (non-negotiable)

- Ne pas casser les fichiers listés dans "Key files"
- Ne pas coder d'UI avant que les migrations Supabase soient appliquées et les types générés
- Ne pas construire : lecteur de scans de chapitres
- Ne pas construire : app native iOS/Android (PWA uniquement)
- Ne pas construire : feed social, profils amis, commentaires, likes
- Ne pas construire : alertes automatisées de sorties (badge "Bientôt" visible mais inactif)
- Ne pas construire : système de paiement, tier premium, abonnements
- Ne pas construire : support manhwa, manhua, anime (les filtres UI ne doivent pas exposer ces options)
- Ne pas construire : marketplace achat/vente entre users
- Ne pas construire : import depuis Tosho, Myutaku, Kenmei, AniList, MangaCollect
- Ne pas construire : intégration libraires physiques, API prix temps réel
- Ne pas hotlinker les jaquettes depuis mangahook ou nautiljon en production : toujours passer par le cache Supabase Storage
- Ne pas bypasser les RLS côté client sous aucun prétexte
- Ne pas stocker de données sensibles hors EU
- Respecter le cap interne : MVP livrable en 10 semaines post-entretiens utilisateurs
- Lighthouse mobile 90+ non négociable avant de considérer une page terminée
- WCAG AA sur composants interactifs : onboarding, formulaires auth, bibliothèque, scan

## Tone (for user-facing content)

- Tutoiement systématique ("tu", "ton", "ta")
- Direct, spartiate, informatif
- Pas de jargon marketing ("révolutionnaire", "disruptif", "game-changer")
- Clin d'œil culture manga léger mais jamais forcé (1 max par page)
- Phrases courtes, actives
- Messages d'erreur : honnêtes et orientés action ("Email invalide. Réessaie.")
- États vides : motivants mais brefs ("Ta bibliothèque est vide. Ajoute ta première série.")
- Emails : signature "L'équipe Yomushelf" ou "Julien" selon le contexte