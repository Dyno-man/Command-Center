# Progress Log

## 2026-04-18

### Completed

- fixed live cluster placement by anchoring markers to real SVG country centroids instead of the old placeholder percentage map
- added a first-pass market relevance gate ahead of clustering in `lib/live-intel.ts`
- exposed ingestion quality stats from the live event route so the UI can show how much content passed or failed the relevance gate
- added map filters for topic, sentiment, impact threshold, and time window
- kept the map, operator rail, and selected event card in sync with the filtered event set
- moved the map filter dock below the mode controls so the command surface no longer overlaps itself
- improved first-pass geo inference with stronger country, demonym, corridor, and regional cue matching

### Next Best Steps

1. move from keyword-heavy geo inference to entity extraction with country and company tagging
2. tune the relevance gate using rejected-story review and false-positive examples
3. add country or region spotlight summaries when the user clicks a geography with multiple filtered events
4. persist ingestion runs and rejected articles so scoring changes can be audited over time

## 2026-04-19

### Completed

- restored a working baseline after the source tree was lost and rebuilt the core Next.js app structure
- re-added a draggable selected-event card on the map
- made the operator rail collapsible
- removed the `World / Geo / Markets / Risk` selectors from the UI
- moved the filters into the top command bar
- added map pan and wheel zoom interactions

### Current Behavior

- the map is now the primary interaction surface again
- filters live at the top of the screen and currently support country, topic, and sentiment
- the selected event card can be dragged around the screen
- the operator rail can be hidden without removing it from the workflow
- map markers still use the current event coordinate model and not a rebuilt high-fidelity live clustering pipeline yet

### Next Best Steps

1. rebuild the richer live-intel pipeline and reconnect real feeds to the recovered UI
2. restore higher-quality marker placement so map points are driven by country geometry and better geo inference
3. add country spotlight summaries and multi-event region drill-down
4. persist source/provider config from the new provider docs into the actual ingestion layer

### Backend Buildout

- added canonical backend provider types and adapter contracts in `lib/providers/types.ts`
- added a provider registry aligned with `command_center_codex_integration_spec.md` in `lib/providers/provider-registry.ts`
- implemented live free adapters for:
  - publisher RSS bundle
  - GDELT
  - USGS earthquakes
  - CoinGecko
- added backend aggregation service in `lib/live-intel.ts`
- upgraded routes:
  - `/api/intel/live-events`
  - `/api/intel/earthquakes`
  - `/api/markets/crypto`
  - `/api/providers`
  - `/api/providers/health`
- reconnected the homepage shell to load live event clusters from the backend

### Notes

- the `worldview` repo was used only for the worthwhile free-provider direction, primarily USGS and CoinGecko
- IPTV/live-stream style sources were intentionally not pulled into the critical backend path

### Agent Harness Refactor

- reworked `lib/live-intel.ts` so the primary backend object is now country intelligence with topic groups and retrieved article lists
- stopped using arbitrary relevance and operator scoring as the main product logic
- kept the old `events` shape only as a derived display layer for the map shell
- added `/api/intel/course-of-action` to request an LLM recommendation for a selected country/topic pair
- made the OpenRouter flow config driven with:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL`
- if OpenRouter is not configured, the backend now returns a prompt preview instead of pretending it produced a real recommendation
- updated the homepage shell so:
  - the map is still primary
  - country clicks drive country selection
  - the operator rail lists grouped topics for the selected country
  - the selected card is a country/topic card with a “Recommend Course Of Action” action

### Current Behavior

- live ingestion groups articles by `country + topic`
- the rail is now a country drill-down rather than a generic action feed
- the LLM recommendation step is explicit and grounded in the current grouped article set
- country/topic/article retrieval is the intended harness foundation for future market-prediction agent rules

### Next Best Steps

1. write the actual agent operating rules in docs and enforce them in the OpenRouter prompt builder
2. improve geo extraction so country assignment is driven by entity quality instead of keyword heuristics
3. add provider-backed primary-source adapters from the codex spec, starting with SEC EDGAR and Federal Register
4. persist grouped article snapshots so recommendations can be audited over time

## 2026-04-19

### Recommendation Enforcement Pass

- integrated `docs/agent/agent_source_of_truth.md` and `docs/agent/agent_response_format.md` into the OpenRouter recommendation flow with in-memory server caching
- added structured response validation for `RECOMMEND`, `WATCH`, and `PASS` outputs before returning a course-of-action result
- tightened the course-of-action route so it now behaves like a conservative long-horizon recommendation agent grounded in retrieved article evidence
- added the planned historical intelligence store note to `docs/dev/architecture.md`
- loosened validator parsing to tolerate common model markdown variations such as code fences and heading depth changes, and surfaced raw model text snippets in the UI when validation fails
- tightened the live article gate so novelty, crime, and other weak general-interest stories are filtered out before country-topic grouping and agent recommendation
- moved provider endpoint URLs into `lib/providers/provider-registry.ts` and updated adapters to read from registry-configured endpoints so new free sources can be plugged in from one obvious config surface
- expanded GDELT from a single query into multiple market-relevant lanes, preserved lane metadata during normalization, added dedupe and stricter GDELT acceptance thresholds, and exposed GDELT lane/debug counts through live-intel meta for tuning
- added `/api/intel/gdelt-debug` so accepted and rejected GDELT stories can be inspected by lane using the same dedupe and filtering path as production
