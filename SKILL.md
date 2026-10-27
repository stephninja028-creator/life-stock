---
name: life-stock
description: Turn a person's documented life into a conceptual stock chart, a readable event timeline, and a short social post in Chinese or English. Use when asked to depict a life or career as a stock/index trend, including requests for an English-language chart; do not use for real securities analysis.
---

# Life Stock

Create a biographical infographic whose market metaphor is legible, emotionally honest, and historically checkable. The index is a narrative device. It must never be presented as a real security price, wealth curve, happiness score, or objective measure of a person's worth.

## Workflow

1. Ask for the person and intended angle only if they cannot be inferred. Examples of angles: career, creative output, public influence, or a specific project. Do not silently score someone's private life by professional success. Infer chart language from the request: use `locale: "en"` for an English chart, otherwise `locale: "zh"` for a Chinese chart. The post may follow the user's requested language independently.
2. Reuse supplied event research and any working rendering code first. For public facts, check important dates and disputed details against credible sources, preferring primary records. Keep year-only or month-only precision where exact dates are uncertain. Separate sourced fact, interpretation, and index setting.
3. Select only turning points necessary to explain the life, with 25 as a strict ceiling rather than a target. A shorter life or sparse historical record should have substantially fewer nodes; never add filler events merely to approach 25 or impose even spacing across years. Include an event only if it changes the chosen narrative angle or supplies essential context. Record each event's sourced date, short title, one-sentence significance, index value, and `up`, `down`, or `neutral` visual classification. Give setbacks room to recover; do not force a redemption arc. If two events share a coarse date, retain their documented order without inventing a more precise date.
4. Group the curve into one to four named periods, each with a short label placed near its stretch of the line. Write the event data in the schema demonstrated by [examples/li-longji.json](examples/li-longji.json) or [examples/li-longji.en.json](examples/li-longji.en.json). Translate *all* visible fields for an English chart: `person`, `title`, `note`, `ending`, period labels, event titles, and summaries. Keep `ticker` legible in Latin letters. The chart annotates major inflections; the lower timeline includes all selected events. Put additional biography in accompanying text rather than padding the image with extra nodes.
5. Render the chart and text from the same data using [scripts/render.mjs](scripts/render.mjs): `node scripts/render.mjs input.json output.svg`. The SVG is self-contained when a local `portrait` path is provided. On macOS, export a PNG with `CLANG_MODULE_CACHE_PATH=/private/tmp/life-stock-module-cache SWIFT_MODULE_CACHE_PATH=/private/tmp/life-stock-module-cache swift scripts/render_png.swift output.svg output.png`; elsewhere use a browser or available SVG converter. Use an AI-generated or user-supplied portrait only when suitable; keep dates, labels, axes, and curve in deterministic SVG so they remain editable and correctable.
6. Inspect the final image at display size. Check chronological order, all labels, line/point colors, overlaps, language consistency, portrait placement, footnote legibility, and agreement with the timeline. For English charts, check that long words and titles are not clipped or awkwardly split. Correct and re-render as needed.
7. Deliver the image, editable SVG, event data, a short post, and links for material historical claims. State the index's conceptual nature in the image itself.

## Visual and editorial rules

- Use a real chronological x-axis. A conceptual y-axis may be normalized to 0–100. Make the choice and rationale clear; do not imply precision the input lacks.
- The image shows years only, even when source data contain month and day; omit finer dates from poster summaries and retain them in research notes. Every displayed year is followed by the person's age at that point. Derive exact event ages from full dates when possible; mark ages based on coarse dates as approximate (`约` in Chinese, `c.` in English). The header has no subtitle.
- Green marks an upward move, red a downward move, and gray a neutral stretch when using the US-market visual convention. Color describes the curve, not moral approval of an event.
- Health events, adoption, disability, relationships, and death are not automatically failures or reductions in human value. If an event affects the chosen narrative angle, explain the connection instead of making a judgment about the person.
- For a deceased person, “permanently halted” may be an apt metaphor. Returning the life index to zero is optional and must be explained as a lifespan boundary, with continued influence acknowledged where relevant. For a living person, end at the stated research cutoff and leave the curve open.
- Avoid imitating a real stock ticker, price, or investment recommendation. Add a short visible note that the index is conceptual.
- Keep the post natural and concise in the requested language: an opening question, a few concrete turns, and an ending that follows from the person's actual story. Do not reuse the Steve Jobs ending for every subject.

## Data and output

The JSON fields and command are documented in the script's help (`node scripts/render.mjs --help`). `locale` is `zh` or `en`, defaulting to `zh` for existing data. The renderer translates its own fixed labels and age notation; it does not translate biographical content. `birthDate` enables age labels. Event `date` accepts `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; `title`, `summary`, and `value` are required. `kind` controls point color; `chartLabel` selects chart annotations. `periods` contains one to four non-overlapping `{startYear, endYear, label}` objects covering the events. The renderer accepts 2–25 events; that technical range does not prescribe the editorial count. It rejects malformed values and timeline inversions that are certain at the available date precision. `sources` are supplied as an array of source objects for the accompanying research record; the SVG does not claim to verify them.

For portrait generation, create the portrait alone on a transparent background, without words, logos, dates, or a chart. Keep the final image in the project or skill folder before rendering.
