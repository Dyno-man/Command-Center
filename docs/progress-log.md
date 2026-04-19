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
