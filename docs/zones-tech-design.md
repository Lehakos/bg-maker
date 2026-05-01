# Zone

```typescript
type ZoneChildType = "zone" | "card" | "piece" | "tile" | "mixed";
type ZoneCapacity = number | null; // null = unlimited

type TableSource =
  | { kind: "component"; componentId: string }
  | { kind: "collection"; collectionId: string };

type ZoneBackground =
  | { type: "none" }
  | { type: "color"; color: string }
  | {
      type: "image";
      dataUrl: string; // base64 image data URL, max 5 MB decoded
      fileName: string;
      fit: "cover" | "contain" | "stretch";
    };

type ZoneLayout = "free" | "stack" | "row" | "grid";
type ZoneVisibility = "all" | "player" | "opponents" | "nobody";

type ZoneBase = {
  id: string;
  name: string; // unique within a table setup
  description: string;
  x: number; // mm, relative to parent zone; root zones are relative to table
  y: number; // mm, relative to parent zone; root zones are relative to table
  width: number; // mm
  height: number; // mm
  padding: number; // mm
  size: "auto" | "fixed";
  overflow: "hidden" | "visible"; // fixed zones can choose; auto zones use visible
  capacity: ZoneCapacity; // UI: checkbox + number input 1..25
  layout: ZoneLayout;
  gap?: number; // row/grid only
  columns?: number; // grid only
  visibility: ZoneVisibility;
  background: ZoneBackground;
  border: {
    width: number;
    color: string;
  };
};

type ZoneContainer = ZoneBase & {
  childrenType: "zone";
  children: Zone[];
};

type ZoneSource = ZoneBase & {
  childrenType: "card" | "piece" | "tile";
  face: "up" | "down";
  source?: TableSource;
  autofill: boolean;
};

type ZoneMixed = ZoneBase & {
  childrenType: "mixed";
  children: ZoneMixedChild[];
};

type ZoneMixedChild = {
  id: string;
  source: TableSource;
  x: number;
  y: number;
  rotationDeg: number;
  face: "front" | "back";
};

type Zone = ZoneContainer | ZoneSource | ZoneMixed;

type TablePlacement = {
  id: string;
  source: TableSource;
  x: number;
  y: number;
  rotationDeg: number;
  face: "front" | "back";
};
```

## Quantity model

Components are single physical definitions. They do not store quantity.

Quantities live in collection items:

```typescript
type ComponentCollectionItem = {
  componentId: string;
  quantity: number;
};
```

Table layout treats every `TableSource` as one physical table object. A collection source renders as
one deck, bag, or custom pack; it is not expanded into individual cards, pieces, or tiles in layout
editing.

If `autofill` is disabled, the zone keeps its source but renders no starting items.

## Container zones

`childrenType: "zone"` zones hold child zones. Child coordinates are relative to the parent zone.

Container zones do not show `source`, `face`, or `autofill`.

When a container zone uses `size: "auto"`, its width and height are derived from its child
zones and the container `layout`. `free` uses child bounds, `row` sums child widths, `grid`
uses the largest child as the cell size, and `stack` grows by the stacked offsets.

## Source zones

`childrenType: "card" | "piece" | "tile"` zones are backed by a component or collection source.

Compatibility rules:

- Component sources must match `childrenType`.
- Collection sources must contain only components matching `childrenType`.
- Dice cannot be used as zone sources.

## Mixed zones

`childrenType: "mixed"` zones accept any table source as a child, including collections and dice.
They do not have zone-level `source`, `face`, or `autofill`. Their `children` are independent
`TableSource` references with coordinates relative to the mixed zone, similar to how a container
zone owns child zones.

## Table placements without zones

Users can build a quick table layout without creating zones.

Components and collections can be dropped directly on the table:

- Components are added as one object.
- Collections are added as a pack.
- Dice are supported as direct table placements and mixed-zone children.
- Cards, pieces, and tiles render with the same previews used elsewhere.
- Deck collections preview as one deck stack using the largest card in the deck.
- Bag collections render as a bag marker: square when the bag includes tiles, circular otherwise.

## Dragging into zones

When dragging a component or collection over the table:

- Compatible source zones highlight when the dragged item matches `childrenType`.
- Dropping onto a compatible source zone sets `zone.source`.
- If the zone already has a different source, the UI asks before replacing it.
- Dropping a component onto a mixed zone adds it to `children`.
- Dropping a collection onto a mixed zone adds that collection as one child.
- Container zones do not accept component or collection sources.

## Component library

The component list is visual, not just textual.

Library items include compact previews:

- Card, piece, and tile components use the same visual preview as table placements.
- Deck collections render as one deck stack.
- Bag collections use the square/circle bag marker.
- Dice appear in the library for direct placement and mixed zones.

The library includes:

- Search by name or tag.
- Type filters for cards, pieces, tiles, dice, and collection types.
- Clear visual separation between single components and collections.
