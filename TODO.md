# BG Maker TODO

Focus: make BG Maker strong for visual tabletop prototypes first. Rules, scripting,
automation, multiplayer, and playtest logic can wait until the editor is fast and
pleasant for building objects and table setups.

## P0 - Visual Prototyping Workflow

- [x] Add duplicate for file tree nodes, object tree nodes, and table setup items.
- [x] Add copy/paste for objects and table setup items.
- [x] Add multi-select in the viewport.
- [x] Add keyboard nudging for selected objects.
- [x] Add align and distribute commands for selected objects.
- [x] Add z-order controls for table setup items and sibling objects.
- [x] Add lock/unlock so background boards and guides are not moved accidentally.
- [x] Add zoom-to-fit and pan controls for the viewport.
- [x] Add export for object previews and table setup screenshots.
- [x] Add print/export sheets for cards, tokens, and tiles.

## P0 - Object Library And Assets

- [x] Keep `fileTree` as the project explorer and source of truth.
- [x] Add an Object Library view over object files with thumbnails, search, and type filters.
- [x] Allow dragging reusable objects from the library into table setups.
- [x] Add an Asset Browser view over image files with thumbnail grid and search.
- [x] Add bulk image upload.
- [x] Add replace image asset while preserving existing object references.
- [x] Allow dragging an image asset onto an image object or image-capable field.

## P1 - New Object Types And Presets

- [ ] Add an `Icon` object type.
- [ ] Add tabletop-native presets for Board, Tile, Hand, Player Area, Score Track, and Market Row.
- [ ] Decide whether presets are separate object kinds or recipes built from existing kinds.

### Icon Object

Purpose: a lightweight reusable symbol for card costs, resources, statuses, factions,
zones, counters, and quick prototype markings.

Initial shape:

- [ ] Add `icon` to `projectObjectKinds`.
- [ ] Add shared `ProjectObjectIcon` component data.
- [ ] Support built-in icon symbols before custom SVG import.
- [ ] Support color, opacity, stroke/fill style, and padding.
- [ ] Render icons as scalable vector-like visuals in `ProjectObjectSurface`.
- [ ] Add an inspector section with icon picker and color controls.
- [ ] Allow template bindings for icon symbol and color.
- [ ] Allow `Icon` as a child inside cards, tokens, boards, and groups.

Possible later additions:

- [ ] Custom SVG upload/import.
- [ ] Icon sets per project.
- [ ] Icon labels or accessibility names.
- [ ] Convert image asset to icon-like object.

## P1 - Variant Creation

- [ ] Add "create object from selected object" flow.
- [ ] Add "save as reusable object" from a table setup local object.
- [ ] Add detach linked object from source.
- [ ] Add CSV/table import for creating card or token variants.
- [ ] Add batch edit for template variable values.
- [ ] Add thumbnail previews for generated variants.

## P1 - Composition Quality

- [ ] Add rulers and guides.
- [ ] Add snap-to-object and snap-to-guide.
- [ ] Add rotate/resize handles per corner or edge.
- [ ] Add aspect ratio lock for resize.
- [ ] Add shared style presets for appearance and text.
- [ ] Add font family selection.
- [ ] Add auto-fit text for labels and card text blocks.
- [ ] Add text shadow or outline for readable prototype labels.

## P2 - Manual Playtest Later

- [ ] Add explicit edit/playtest mode.
- [ ] Add manual card flip actions.
- [ ] Add manual deck shuffle and draw actions.
- [ ] Add manual die roll action.
- [ ] Add manual counter increment/decrement actions.
- [ ] Add hidden/revealed state for placed objects.
- [ ] Add playtest action history.

## Cleanup And Quality

- [ ] Keep business logic out of UI components.
- [ ] Add focused tests for object tree, table setup, duplication, import, and export helpers.
- [ ] Keep prototype data model changes clean; do not add migration layers unless needed.
