# WIZARD ↔ TRIVIUM Integration Contract

## Role

WIZARD decides **what a small game needs**. TRIVIUM decides **how the selected sources can be realized in a target form without losing their required meaning**.

WIZARD must search the full catalog without using engine origin as a creative filter. Unity, Unreal/Fab, Godot, Blender, sprites, audio, scenes, templates and legacy sources are all production material.

## Required output to TRIVIUM

A Production Brief must describe roles and obligations, not target-engine classes.

```yaml
role: clockwork_guard
required:
  - recognizable_silhouette
  - idle
  - locomotion
  - one_interaction
  - collision_presence
optional:
  - facial_rig
  - cloth
source_candidates:
  - asset_id: ...
    origin: unity
    license: ...
```

WIZARD should record for every source:

- provenance and license constraints
- source engine and version when known
- contained capabilities: mesh, rig, animations, textures, code, audio, scene hierarchy
- semantic roles the source may fulfill
- conversion evidence already known
- direct, convertible, bakeable, reconstructable or unsuitable status

## Engine neutrality

WIZARD must not recommend an engine merely because most selected assets originate there. It may recommend a realization based on cost, quality and available transformations, but engine choice remains a downstream production decision.

Example:

```text
Idea needs a town, two characters and eight-way movement.
Available material is mostly Unity 3D.
Possible outputs:
- Unreal 3D via extraction and reconstruction
- Godot 3D via glTF and scene adapters
- 2D via animation baking and atlas generation
```

## Missing-asset logic

A role is not missing merely because no native target-engine asset exists. It is missing only when no acceptable realization route exists within the contract.

## Boundaries

WIZARD does not:

- perform conversion
- invent undocumented license permissions
- declare a route successful without evidence
- collapse a source asset into its file extension or store origin

## Canonical references

- TRIVIUM architecture: https://github.com/Lootziffer666/TRIVIUM/tree/docs/semantic-realization-direction/docs
- Converter/tool candidates: https://github.com/Lootziffer666/TRIVIUM/blob/docs/semantic-realization-direction/docs/tool-candidate-catalog.md
- Realization contracts: https://github.com/Lootziffer666/TRIVIUM/blob/docs/semantic-realization-direction/docs/realization-contracts.md
