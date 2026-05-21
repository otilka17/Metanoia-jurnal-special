# PRD - Ghid Părinte: Educația Copilului Supradotat / Hiperactiv

## Overview
Mobile app (Expo React Native, iOS + Android) — Romanian-language educational guide for parents of gifted/hyperactive (ADHD/2e) children. Structure mirrors a provided NotebookLM mind map with 5 main categories and 12 subtopics.

## Tech Stack
- Frontend: Expo SDK 54, expo-router, React Native 0.81, expo-secure-store
- Backend: FastAPI + Motor (MongoDB)
- Auth: JWT (bcrypt password hash, 30-day token)
- AI: Claude Sonnet 4.5 via Emergent LLM key (article generation, cached in MongoDB)

## Mind Map Structure (5 Categories)
1. Înțelegerea Profilului Neurodivergent — Dezvoltare Asincronă, Supraexcitabilități (OEs), Dublă Excepționalitate (2e)
2. Fundația Atitudinii Părintelui — Autoreglare și Calm, Conectare înainte de Corectare
3. Arhitectura Limitelor Sănătoase — Fermitate vs. Control, Predictibilitate și Rutină, Gestionarea Consecințelor
4. Managementul Energiei și Învățării — Suport Acasă, Strategii la Școală
5. Gestionarea Crizelor (Meltdowns) — Intervenție în Momentul Critic, Recuperare și Tehnici

## Screens
- `(auth)/login`, `(auth)/register` — Email/password authentication
- `(tabs)/index` — Home dashboard with daily tip + 5 categories list
- `(tabs)/search` — Search across categories + subtopics + points (with suggestion chips)
- `(tabs)/journal` — Parent journal (mood, title, note, triggers) with modal form
- `(tabs)/profile` — User info, bookmarks list, logout
- `category/[id]` — Category detail with subtopics
- `article/[id]` — AI-generated article (intro, key points, practical tips, example, when to ask help) + bookmark

## API Endpoints (all under /api)
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /categories`, `GET /categories/{id}`
- `GET /search?q=`
- `GET /article/{subtopic_id}` (auth required, cached in MongoDB)
- `GET/POST/DELETE /bookmarks` (auth)
- `GET/POST/DELETE /journal` (auth)

## Design System
- Light "Organic & Earthy" theme: Sage Green (#5E8B7E) primary, Warm Sand (#DE8F6E) secondary, Warm Off-White (#F9F8F6) bg
- Each of the 5 categories has its own accent color
- Typography: Manrope (headings), Work Sans (body) — system fallback applied
- Border radius: 12/16/24 px; pill buttons (999 radius)

## Business Enhancement
The app retains parents through habit loops (daily tip on home + journal tracking) — daily journaling builds a personal dataset that increases switching cost and supports a future "Premium" tier (advanced AI analysis of behavior patterns, personalized recommendations, expert tele-consult bookings).

## MOCKED / Notes
- Daily tip is currently STATIC text (not personalized). Can be made dynamic per-day later.
- All article content is generated **live by Claude on first access**, then cached in MongoDB for instant reload.
