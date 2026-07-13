# WIZARD ↔ LAB

WIZARD receives semantic asset needs from TRIVIUM and resolves them against the existing catalog. It may also register extracted or SWIFT-generated artifacts as session assets.

`src/lib/lab.ts` provides:

- conversion from a LAB need to WIZARD search parameters;
- conversion from generated artifacts to WIZARD's existing `Asset` shape;
- a production-context string for the AI brief;
- explicit binding states: existing, generated, or missing.

## BELLOWS boundary

Deterministic catalog filtering stays local. Any model-assisted semantic search, production brief, ranking, tagging or missing-asset explanation must use the LAB `aiGateway`, which points to BELLOWS. WIZARD must not hold provider-specific keys or call Claude, Gemini, OpenAI or another provider directly.

The current LAB adapter creates context and bindings but does not perform a provider request itself. This keeps the boundary honest until WIZARD's server-side Bellows client is wired.

The gateway now also carries the OpenAI-compatible `text`/`image_url` contract. Once wired, WIZARD can send an extracted preview together with the semantic need to a vision-capable model through BELLOWS for style/material/role comparison. Catalog filtering and exact metadata matching remain deterministic, and inline image data must never be stored in WIZARD records.

WIZARD does not infer game rules from filenames. The need's role and acceptable realization come from TRIVIUM contracts; WIZARD answers which available asset can fulfil that role and what remains missing.
