 Command Center Single Source Of Truth

## Product Name

Command Center

## One-Sentence Definition

Command Center is a personal intelligence application that turns global news into a live, market-aware world view so the user can quickly understand what is happening, why it matters, and what may move markets next.

## Problem

Important world events are fragmented across too many feeds, too much noise, and too little context. Most news products tell the user what happened, but not:

- how important it is
- where it is happening
- which assets or sectors it may affect
- whether sentiment is improving or deteriorating
- what deserves attention right now

## Vision

Build a personal geopolitical and market intelligence terminal for an individual operator. It should feel like a command post, not a generic news app.

The product should answer five questions faster than any dashboard the user currently has:

- What is happening in the world right now?
- Where is it happening?
- Why does it matter?
- What is the likely market impact?
- What should I watch next?

## Product Principles

1. Relevance over volume.
Only show information that has a meaningful probability of affecting markets, the user’s watchlists, or global risk conditions.

2. Geography is the interface.
The world map is not decoration. It is a primary navigation surface for understanding events by region, country, and conflict zone.

3. Markets are downstream of events.
The product should connect geopolitical, macro, regulatory, corporate, and supply-chain events to likely asset impact.

4. AI should compress, not hallucinate.
LLMs are used for summarization, comparison, clustering, translation, and reasoning over retrieved facts. Raw source provenance remains visible.

5. One feed, multiple lenses.
The same event graph should support map view, timeline view, alert view, and asset-impact view.

6. Personal operator workflow first.
This is not a social network and not a mass-market newspaper replacement. It is a focused decision-support system for one user.

## Target User

Primary user:

- A self-directed investor, trader, or macro-focused operator who wants high-signal situational awareness.

Likely behaviors:

- checks markets and headlines multiple times per day
- follows geopolitics, macro, and company-specific news
- wants speed, clarity, and prioritization more than article depth
- is willing to configure watchlists, regions, sectors, and alert thresholds

## Core Outcome

Within 3 to 5 minutes, the user should be able to open Command Center and leave with:

- the top global developments
- the highest-risk regions
- the strongest market-moving narratives
- a view of which assets, sectors, or themes are under pressure
- clear follow-up items to monitor

## Product Pillars

### 1. Global News Intelligence

Ingest world news, cluster related stories, summarize developments, and rank them by probable market relevance.

### 2. Interactive World Map

Use the map to browse hotspots, filter by topic, and inspect live event clusters and sentiment by geography.

### 3. Market Impact Engine

Estimate which events matter most to equities, commodities, FX, rates, and sectors.

### 4. AI Briefing Layer

Use LLMs to produce concise operator briefings, explain why a story matters, and surface second-order effects.

### 5. Personalization And Alerts

Tailor feeds and alerts to the user’s watchlist, countries, industries, themes, and risk tolerance.

## v1 Scope

The first useful version should include:

- multi-source news ingestion
- event clustering and deduplication
- basic entity extraction for countries, companies, sectors, and themes
- sentiment scoring at article and event-cluster level
- a market-impact score
- an interactive world map with event markers
- a top stories command dashboard
- user watchlists and alert preferences
- AI-generated summaries with source links

## Not In v1

- automated trading
- portfolio execution
- fully institutional-grade tick data terminal replacement
- social posting or community features
- sprawling customization that slows down shipping

## Success Criteria

### User Success

- The user trusts the app enough to make it part of a daily routine.
- The user can identify the top 5 market-moving stories faster than with existing workflows.
- The user can discover region-specific risks that would otherwise be missed.

### Product Success

- High precision on top-story ranking
- Low duplication and low noise in the main feed
- Fast load times for dashboard and map
- Clear source provenance on every summary
- Alerts that are useful often enough to avoid being muted

## Product Risks

- Low-quality source data will poison downstream scoring.
- Naive sentiment analysis will misread financial and geopolitical language.
- A map-heavy UI could become visually impressive but operationally weak.
- LLM summaries without strong grounding will erode trust.
- Real-time ingestion and scoring can get expensive quickly.

## Strategic Bets

- Geopolitical context plus market impact is a stronger wedge than generic news summarization.
- Map-based interaction creates a differentiated workflow if the data model is good enough.
- Combining deterministic scoring with LLM explanation will outperform either approach alone.

## Source Of Truth Rules

- This document defines product intent and boundary conditions.
- Feature docs may add detail but must not expand scope without updating this document.
- Engineering decisions should optimize for signal quality, trust, and operator speed.
