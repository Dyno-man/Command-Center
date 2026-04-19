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
