# Backlog

## Content Quality

### Market Relevance Filter

Problem:

The live news pipeline can still surface stories that are globally visible but not meaningfully market-moving.

Status:

- initial heuristic gate implemented on 2026-04-18
- still needs tuning against false positives and false negatives
- observed false positives include general-interest and public-safety stories with no durable market relevance
- recommendation quality will remain noisy until this pre-agent filtering is tightened

## Agent UX

### Recommendation Follow-Up Workspace

Problem:

The current recommendation flow stops at a single `RECOMMEND` / `WATCH` / `PASS` response. There is no way to ask follow-up questions, inspect longer-term history, or bring more context into the reasoning loop after the user clicks the course-of-action button.

Desired Behavior:

- after generating a course of action for a selected country/topic, the user can open a dedicated follow-up workspace
- the workspace should feel like a ChatGPT-style thread tied to that country/topic, so the user can ask clarifying questions and iterate with the model
- the page should include a side options panel for attaching additional context before or during the conversation
- the side panel should support:
  - historical article retrieval from the SQLite intel store
  - configurable date ranges
  - source or provider filters
  - topic and lane filters
  - other relevant collected data tied to the selected topic over time
- the model context for follow-up chat should remain grounded in the selected topic, retrieved articles, and any user-selected historical data slices

Implementation Notes:

- add a route/page for a topic follow-up workspace launched from the recommendation card
- persist chat threads by `country + topic` so users can return to prior investigation sessions
- expose backend query helpers over the SQLite article store for historical retrieval and date-range filtering
- make context assembly explicit so the chat view can show what historical slices and sources were attached to each answer
