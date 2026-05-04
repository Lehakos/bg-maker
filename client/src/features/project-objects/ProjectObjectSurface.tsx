import type {
  ProjectFileNode,
  ProjectObjectAppearance,
  ProjectObjectBagAppearanceVariant,
  ProjectObjectBorderStyle,
  ProjectObjectCounter,
  ProjectObjectKind,
  ProjectObjectMeepleVisualVariant,
  ProjectObjectNode,
  ProjectObjectShapePoint,
  ProjectObjectShapeVariant,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectDieFace,
  getDefaultProjectObjectShapePolygonPoints,
  getProjectObjectContainerTotalCount
} from "@bg-maker/shared";
import type { CSSProperties } from "react";
import {
  getProjectObjectNodeBag,
  getProjectObjectNodeCounter,
  getProjectObjectNodeAppearance,
  getProjectObjectNodeContainer,
  getProjectObjectNodeDie,
  getProjectObjectNodeIcon,
  getProjectObjectNodeImage,
  getProjectObjectNodeMeeple,
  getProjectObjectNodeShape,
  getProjectObjectNodeStackDisplay,
  getProjectObjectNodeText
} from "./project-object-tree";
import { getProjectObjectZoneSlotRects } from "./project-object-zone";
import { BagIcon, BoxIcon } from "./project-object-icons";
import { getProjectObjectIconRegistryEntry } from "./project-object-icon-registry";
import { ProjectObjectKindIcon } from "./project-object-tree-ui";
import type { ProjectImageAssetOption } from "../project-assets/project-image-assets";

type ProjectObjectSurfaceProps = {
  fileTree: ProjectFileNode[];
  imageAssetById: Map<string, ProjectImageAssetOption>;
  object: ProjectObjectNode;
};

export function ProjectObjectSurface({
  fileTree,
  imageAssetById,
  object
}: ProjectObjectSurfaceProps) {
  if (object.kind === "card") {
    return <CardVisual object={object} />;
  }

  if (object.kind === "counter") {
    return <CounterVisual object={object} />;
  }

  if (object.kind === "deck") {
    return <DeckVisual object={object} />;
  }

  if (object.kind === "bag") {
    return <BagVisual object={object} />;
  }

  if (object.kind === "zone") {
    return <ZoneVisual fileTree={fileTree} object={object} />;
  }

  if (object.kind === "die") {
    return <DieVisual imageAssetById={imageAssetById} object={object} />;
  }

  if (object.kind === "meeple") {
    return <MeepleVisual object={object} />;
  }

  if (object.kind === "token") {
    return <TokenVisual object={object} />;
  }

  if (object.kind === "group") {
    return <GroupVisual object={object} />;
  }

  if (object.kind === "label") {
    return <LabelVisual object={object} />;
  }

  if (object.kind === "image") {
    return <ImageVisual imageAssetById={imageAssetById} object={object} />;
  }

  if (object.kind === "icon") {
    return <IconVisual object={object} />;
  }

  return <ShapeVisual object={object} />;
}

type ObjectVisualProps = {
  object: ProjectObjectNode;
};

type ZoneVisualProps = ObjectVisualProps & {
  fileTree: ProjectFileNode[];
};

function GroupVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);

  return (
    <div
      className="relative h-full w-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]"
      style={getAppearanceStyle(appearance)}
    >
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md border border-teal-500/30 bg-white/85 px-2 py-1 text-xs font-semibold text-teal-800 shadow-sm">
        <ProjectObjectKindIcon className="shrink-0" kind={object.kind} size={14} />
        <span className="truncate">{object.name}</span>
      </div>
    </div>
  );
}

function CardVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);

  return (
    <div
      className="relative h-full w-full overflow-hidden shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
      style={getAppearanceStyle(appearance)}
    />
  );
}

function CounterVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const counter = getProjectObjectNodeCounter(object);
  const displayValue = getCounterDisplayValue(counter);

  return (
    <div
      className="relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden text-center shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
      style={getAppearanceStyle(appearance)}
    >
      <span className="min-w-0 max-w-full truncate text-3xl font-bold leading-none tracking-normal text-blue-950 tabular-nums">
        {displayValue}
      </span>
    </div>
  );
}

function DeckVisual({ object }: ObjectVisualProps) {
  return (
    <StackedContainerVisual
      countClassName="border-sky-200 text-sky-700"
      emptyClassName="text-sky-800"
      emptyLabel="Empty deck"
      iconKind="deck"
      object={object}
    />
  );
}

function BagVisual({ object }: ObjectVisualProps) {
  const bag = getProjectObjectNodeBag(object);
  const appearance = getProjectObjectNodeAppearance(object);
  const container = getProjectObjectNodeContainer(object);
  const totalCount = getProjectObjectContainerTotalCount(container);
  const Icon = bag.appearanceVariant === "box" ? BoxIcon : BagIcon;
  const emptyLabel = bag.appearanceVariant === "box" ? "Empty box" : "Empty bag";
  const countClassName =
    bag.appearanceVariant === "box"
      ? "border-amber-200 text-amber-700"
      : "border-violet-200 text-violet-700";
  const emptyClassName =
    bag.appearanceVariant === "box" ? "text-amber-800" : "text-violet-800";

  return (
    <div
      className="relative h-full w-full overflow-visible"
      style={{ opacity: appearance.opacity }}
    >
      <BagContainerShape appearance={appearance} variant={bag.appearanceVariant} />
      {totalCount === 0 ? (
        <div
          className={`absolute inset-0 flex min-w-0 flex-col items-center justify-center px-2 ${emptyClassName}`}
          style={{ padding: appearance.padding }}
        >
          <Icon size={24} />
          <span className="mt-2 max-w-full truncate text-xs font-semibold">{emptyLabel}</span>
        </div>
      ) : null}
      <span
        className={`pointer-events-none absolute bottom-1.5 right-1.5 rounded border bg-white/90 px-1.5 py-0.5 text-[10px] font-bold leading-none shadow-sm ${countClassName}`}
      >
        {totalCount}
      </span>
    </div>
  );
}

type BagContainerShapeProps = {
  appearance: ProjectObjectAppearance;
  variant: ProjectObjectBagAppearanceVariant;
};

function BagContainerShape({ appearance, variant }: BagContainerShapeProps) {
  const fill = getColorWithOpacity(appearance.backgroundColor, appearance.backgroundOpacity);
  const strokeWidth = appearance.borderStyle === "none" ? 0 : appearance.borderWidth;
  const strokeDasharray = getStrokeDasharray(appearance.borderStyle);

  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full overflow-visible"
      preserveAspectRatio="none"
      style={{
        filter: "drop-shadow(0 14px 18px rgba(15, 23, 42, 0.16))"
      }}
      viewBox="0 0 100 100"
    >
      {variant === "box" ? (
        <BoxContainerShapeSvg
          fill={fill}
          stroke={appearance.borderColor}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
        />
      ) : (
        <BagContainerShapeSvg
          fill={fill}
          stroke={appearance.borderColor}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  );
}

type BagContainerShapeSvgProps = {
  fill: string;
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
};

function BagContainerShapeSvg({
  fill,
  stroke,
  strokeDasharray,
  strokeWidth
}: BagContainerShapeSvgProps) {
  const detailStrokeWidth = Math.max(1.2, strokeWidth * 0.7);

  return (
    <>
      <path
        d="M35 19c3.2-7.6 9-11 15-11s11.8 3.4 15 11"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={detailStrokeWidth}
        opacity="0.75"
      />
      <path
        d="M28 25c8.8 6.3 34.2 6.3 43 0"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={detailStrokeWidth}
        opacity="0.7"
      />
      <path
        d="M29 27c-12 15.5-16 46.2-3.5 60C35 97.5 65 97.5 74.5 87 87 73.2 83 42.5 71 27c-10 7-32 7-42 0Z"
        fill={fill}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M33 37c9.5 5.4 24.5 5.4 34 0"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={detailStrokeWidth}
        opacity="0.3"
      />
      <path
        d="M38 27c-2.5 6-2.2 12 .8 17M62 27c2.5 6 2.2 12-.8 17"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={detailStrokeWidth}
        opacity="0.2"
      />
    </>
  );
}

function BoxContainerShapeSvg({
  fill,
  stroke,
  strokeDasharray,
  strokeWidth
}: BagContainerShapeSvgProps) {
  const detailStrokeWidth = Math.max(1.2, strokeWidth * 0.7);

  return (
    <>
      <path
        d="M10 29 50 10l40 19-40 20-40-20Z"
        fill={fill}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M10 29v43l40 20V49L10 29Z"
        fill={fill}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M90 29v43L50 92V49l40-20Z"
        fill={fill}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M10 29 50 49l40-20M50 49v43"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={detailStrokeWidth}
        opacity="0.85"
      />
    </>
  );
}

type StackedContainerVisualProps = ObjectVisualProps & {
  countClassName: string;
  emptyClassName: string;
  emptyLabel: string;
  iconKind: ProjectObjectKind;
};

function StackedContainerVisual({
  countClassName,
  emptyClassName,
  emptyLabel,
  iconKind,
  object
}: StackedContainerVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const container = getProjectObjectNodeContainer(object);
  const stackDisplay = getProjectObjectNodeStackDisplay(object);
  const totalCount = getProjectObjectContainerTotalCount(container);
  const visibleLayerCount = Math.max(
    1,
    Math.min(totalCount || 1, stackDisplay.visibleItemCount)
  );

  return (
    <div className="relative h-full w-full overflow-visible">
      {Array.from({ length: visibleLayerCount }, (_, index) => {
        const reverseIndex = visibleLayerCount - index - 1;

        return (
          <div
            key={index}
            aria-hidden={index > 0}
            className="absolute inset-0 overflow-hidden shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
            style={{
              ...getAppearanceStyle(appearance),
              transform: `translate(${reverseIndex * stackDisplay.stackOffsetX}px, ${reverseIndex * stackDisplay.stackOffsetY}px)`
            }}
          />
        );
      })}
      {totalCount === 0 ? (
        <div
          className={`absolute inset-0 flex min-w-0 flex-col items-center justify-center px-2 ${emptyClassName}`}
        >
          <ProjectObjectKindIcon kind={iconKind} size={24} />
          <span className="mt-2 max-w-full truncate text-xs font-semibold">{emptyLabel}</span>
        </div>
      ) : null}
      {stackDisplay.showCount ? (
        <span
          className={`pointer-events-none absolute bottom-1.5 right-1.5 rounded border bg-white/90 px-1.5 py-0.5 text-[10px] font-bold leading-none shadow-sm ${countClassName}`}
        >
          {totalCount}
        </span>
      ) : null}
    </div>
  );
}

function ZoneVisual({ fileTree, object }: ZoneVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const slotRects = getProjectObjectZoneSlotRects(fileTree, object);

  return (
    <div
      className="relative h-full w-full overflow-visible shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]"
      style={{ ...getAppearanceStyle(appearance), padding: 0 }}
    >
      {slotRects.map((slotRect, index) => (
        <span
          key={index}
          aria-hidden
          className="pointer-events-none absolute rounded border border-cyan-500/35 bg-cyan-200/20"
          style={{
            height: `${slotRect.height}px`,
            left: `${slotRect.x}px`,
            top: `${slotRect.y}px`,
            width: `${slotRect.width}px`
          }}
        />
      ))}
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md border border-cyan-500/30 bg-white/85 px-2 py-1 text-xs font-semibold text-cyan-800 shadow-sm">
        <ProjectObjectKindIcon className="shrink-0" kind={object.kind} size={14} />
        <span className="truncate">{object.name}</span>
      </div>
    </div>
  );
}

function DieVisual({ imageAssetById, object }: ImageVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const die = getProjectObjectNodeDie(object);
  const face = die.faces[die.activeFace - 1] ?? getDefaultProjectObjectDieFace(die.activeFace);
  const imageAsset =
    face.mode === "image" && face.imageAssetId ? imageAssetById.get(face.imageAssetId) : undefined;

  return (
    <div
      className="relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden text-center shadow-[0_16px_32px_rgba(15,23,42,0.16)]"
      style={getAppearanceStyle(appearance)}
    >
      {face.mode === "image" ? (
        imageAsset ? (
          <img
            alt={imageAsset.name}
            className="h-full w-full select-none object-contain"
            draggable={false}
            src={imageAsset.url}
          />
        ) : (
          <div className="flex min-w-0 flex-col items-center px-2 text-amber-700">
            <ProjectObjectKindIcon kind="die" size={24} />
            <span className="mt-2 max-w-full truncate text-xs font-semibold">
              {face.imageAssetId ? "Missing image" : "No image"}
            </span>
          </div>
        )
      ) : (
        <span className="min-w-0 max-w-full truncate text-4xl font-bold leading-none text-slate-950">
          {face.label || die.activeFace}
        </span>
      )}
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded border border-amber-200 bg-white/90 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-700 shadow-sm">
        D{die.faceCount}
      </span>
    </div>
  );
}

function LabelVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const text = getProjectObjectNodeText(object);

  return (
    <div
      className="relative flex h-full w-full min-w-0 overflow-hidden shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
      style={{
        ...getAppearanceStyle(appearance),
        alignItems: getVerticalAlignItems(text.verticalAlign),
        justifyContent: getTextJustifyContent(text.textAlign),
        color: text.color,
        fontSize: `${text.fontSize}px`,
        fontStyle: text.fontStyle,
        fontWeight: text.fontWeight,
        lineHeight: text.lineHeight,
        textAlign: text.textAlign
      }}
    >
      <span className="min-w-0 max-w-full whitespace-pre-wrap break-words">
        {text.content || object.name}
      </span>
    </div>
  );
}

type ImageVisualProps = ObjectVisualProps & {
  imageAssetById: Map<string, ProjectImageAssetOption>;
};

function ImageVisual({ imageAssetById, object }: ImageVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const image = getProjectObjectNodeImage(object);
  const imageAsset = image.assetId ? imageAssetById.get(image.assetId) : undefined;

  return (
    <div
      className="relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden text-center shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
      style={getAppearanceStyle(appearance)}
    >
      {imageAsset ? (
        <img
          alt={imageAsset.name}
          className="h-full w-full select-none"
          draggable={false}
          src={imageAsset.url}
          style={{
            objectFit: image.fit === "scaleDown" ? "scale-down" : image.fit,
            objectPosition: `${image.positionX}% ${image.positionY}%`
          }}
        />
      ) : (
        <div className="flex min-w-0 flex-col items-center px-2 text-slate-500">
          <ProjectObjectKindIcon kind="image" size={24} />
          <span className="mt-2 max-w-full truncate text-xs font-semibold">
            {image.assetId ? "Missing image" : "No image"}
          </span>
        </div>
      )}
    </div>
  );
}

function IconVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const icon = getProjectObjectNodeIcon(object);
  const Icon = getProjectObjectIconRegistryEntry(icon.symbol).icon;
  const filled = icon.style === "filled";

  return (
    <div
      className="relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden text-center"
      style={getAppearanceStyle(appearance)}
    >
      <span
        className="flex h-full w-full min-w-0 items-center justify-center"
        style={{
          color: icon.color
        }}
      >
        <Icon
          aria-hidden
          className="h-full w-full"
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={filled ? 1.4 : 2}
        />
      </span>
    </div>
  );
}

function ShapeVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const shape = getProjectObjectNodeShape(object);
  const strokeDasharray = getStrokeDasharray(appearance.borderStyle);
  const strokeWidth = appearance.borderStyle === "none" ? 0 : appearance.borderWidth;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-visible text-center text-emerald-950"
      style={{ opacity: appearance.opacity }}
    >
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <ShapeSvgElement
          borderRadius={appearance.borderRadius}
          fill={appearance.backgroundColor}
          fillOpacity={appearance.backgroundOpacity}
          stroke={appearance.borderColor}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          polygonPoints={shape.polygonPoints}
          variant={shape.variant}
        />
      </svg>
      <span
        className="relative z-10 max-w-full truncate text-sm font-semibold"
        style={{ padding: appearance.padding }}
      >
        {object.name}
      </span>
    </div>
  );
}

function MeepleVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const meeple = getProjectObjectNodeMeeple(object);
  const strokeDasharray = getStrokeDasharray(appearance.borderStyle);
  const strokeWidth = appearance.borderStyle === "none" ? 0 : appearance.borderWidth;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-visible text-center text-red-950"
      style={{ opacity: appearance.opacity }}
    >
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        style={{ filter: "drop-shadow(0 14px 18px rgba(15, 23, 42, 0.16))" }}
        viewBox="0 0 100 100"
      >
        <MeepleSvgElement
          fill={appearance.backgroundColor}
          fillOpacity={appearance.backgroundOpacity}
          stroke={appearance.borderColor}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          variant={meeple.visualVariant}
        />
      </svg>
    </div>
  );
}

function TokenVisual({ object }: ObjectVisualProps) {
  const appearance = getProjectObjectNodeAppearance(object);
  const shape = getProjectObjectNodeShape(object);
  const strokeDasharray = getStrokeDasharray(appearance.borderStyle);
  const strokeWidth = appearance.borderStyle === "none" ? 0 : appearance.borderWidth;

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-visible text-center text-orange-950 shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
      style={{ opacity: appearance.opacity }}
    >
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <ShapeSvgElement
          borderRadius={appearance.borderRadius}
          fill={appearance.backgroundColor}
          fillOpacity={appearance.backgroundOpacity}
          stroke={appearance.borderColor}
          strokeDasharray={strokeDasharray}
          strokeWidth={strokeWidth}
          polygonPoints={shape.polygonPoints}
          variant={shape.variant}
        />
      </svg>
    </div>
  );
}

type MeepleSvgElementProps = {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
  variant: ProjectObjectMeepleVisualVariant;
};

function MeepleSvgElement({
  fill,
  fillOpacity,
  stroke,
  strokeDasharray,
  strokeWidth,
  variant
}: MeepleSvgElementProps) {
  const commonProps = {
    fill,
    fillOpacity,
    stroke,
    strokeDasharray,
    strokeLinejoin: "round" as const,
    strokeWidth
  };
  const detailStrokeWidth = strokeWidth > 0 ? Math.max(1.1, strokeWidth * 0.7) : 0;

  if (variant === "pawn") {
    return (
      <>
        <circle {...commonProps} cx="50" cy="16" r="12" />
        <path {...commonProps} d="M38 32h24l6 39h10v22H22V71h10l6-39Z" />
        <path
          d="M35 71h30"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={detailStrokeWidth}
          opacity="0.35"
        />
      </>
    );
  }

  if (variant === "cube") {
    return (
      <>
        <path {...commonProps} d="M15 31 50 12l35 19-35 20-35-20Z" />
        <path {...commonProps} d="M15 31v39l35 20V51L15 31Z" />
        <path {...commonProps} d="M85 31v39L50 90V51l35-20Z" />
        <path
          d="M15 31 50 51l35-20M50 51v39"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={detailStrokeWidth}
          opacity="0.6"
        />
      </>
    );
  }

  if (variant === "cylinder") {
    return (
      <>
        <path {...commonProps} d="M20 27v43c0 11 13.5 20 30 20s30-9 30-20V27" />
        <ellipse {...commonProps} cx="50" cy="27" rx="30" ry="15" />
        <path
          d="M20 70c0 11 13.5 20 30 20s30-9 30-20"
          fill="none"
          stroke={stroke}
          strokeWidth={detailStrokeWidth}
          opacity="0.4"
        />
      </>
    );
  }

  if (variant === "cone") {
    return (
      <>
        <path {...commonProps} d="M50 9 20 80c8 11 52 11 60 0L50 9Z" />
        <ellipse {...commonProps} cx="50" cy="80" rx="30" ry="12" />
        <path
          d="M35 76c8 4 22 4 30 0"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={detailStrokeWidth}
          opacity="0.35"
        />
      </>
    );
  }

  if (variant === "standee") {
    return (
      <>
        <rect {...commonProps} height="62" rx="5" ry="5" width="42" x="29" y="8" />
        <path {...commonProps} d="M38 70h24l4 15H34l4-15Z" />
        <path {...commonProps} d="M24 85h52v8H24z" />
        <path
          d="M37 20h26M37 31h26"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={detailStrokeWidth}
          opacity="0.28"
        />
      </>
    );
  }

  return (
    <>
      <circle {...commonProps} cx="50" cy="16" r="12" />
      <path
        {...commonProps}
        d="M36 32c-9 1-17 8-24 20l10 10c4-5 8-9 13-11l-6 44h16l5-25 5 25h16l-6-44c5 2 9 6 13 11l10-10c-7-12-15-19-24-20H36Z"
      />
      <path
        d="M38 47c7 4 17 4 24 0"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={detailStrokeWidth}
        opacity="0.28"
      />
    </>
  );
}

type ShapeSvgElementProps = {
  borderRadius: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
  polygonPoints?: readonly ProjectObjectShapePoint[];
  variant: ProjectObjectShapeVariant;
};

function ShapeSvgElement({
  borderRadius,
  fill,
  fillOpacity,
  stroke,
  strokeDasharray,
  strokeWidth,
  polygonPoints,
  variant
}: ShapeSvgElementProps) {
  const commonProps = {
    fill,
    fillOpacity,
    stroke,
    strokeDasharray,
    strokeLinejoin: "round" as const,
    strokeWidth
  };

  if (variant === "ellipse") {
    return <ellipse {...commonProps} cx="50" cy="50" rx="49" ry="49" />;
  }

  if (variant === "diamond") {
    return <polygon {...commonProps} points="50,1 99,50 50,99 1,50" />;
  }

  if (variant === "triangle") {
    return <polygon {...commonProps} points="50,2 99,98 1,98" />;
  }

  if (variant === "hexagon") {
    return <polygon {...commonProps} points="50,2 92,25 92,75 50,98 8,75 8,25" />;
  }

  if (variant === "polygon") {
    return <polygon {...commonProps} points={getPolygonPointsAttribute(polygonPoints)} />;
  }

  return (
    <rect
      {...commonProps}
      height="98"
      rx={Math.min(49, borderRadius)}
      ry={Math.min(49, borderRadius)}
      width="98"
      x="1"
      y="1"
    />
  );
}

function getPolygonPointsAttribute(polygonPoints: readonly ProjectObjectShapePoint[] = []) {
  const points =
    polygonPoints.length >= 3 ? polygonPoints : getDefaultProjectObjectShapePolygonPoints();

  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function getCounterDisplayValue(counter: ProjectObjectCounter) {
  const maxValue = counter.displayMode === "valueAndMax" ? ` / ${counter.maxValue}` : "";

  return `${counter.prefix}${counter.defaultValue}${maxValue}${counter.suffix}`;
}

function getAppearanceStyle(appearance: ProjectObjectAppearance): CSSProperties {
  return {
    backgroundColor: getColorWithOpacity(appearance.backgroundColor, appearance.backgroundOpacity),
    borderColor: appearance.borderColor,
    borderRadius: `${appearance.borderRadius}px`,
    borderStyle: appearance.borderStyle,
    borderWidth: appearance.borderStyle === "none" ? 0 : `${appearance.borderWidth}px`,
    opacity: appearance.opacity,
    padding: `${appearance.padding}px`
  };
}

function getColorWithOpacity(color: string, opacity: number) {
  if (opacity <= 0) {
    return "transparent";
  }

  const hexColor = color.replace("#", "");
  const red = Number.parseInt(hexColor.slice(0, 2), 16);
  const green = Number.parseInt(hexColor.slice(2, 4), 16);
  const blue = Number.parseInt(hexColor.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function getStrokeDasharray(borderStyle: ProjectObjectBorderStyle) {
  if (borderStyle === "dashed") {
    return "8 6";
  }

  if (borderStyle === "dotted") {
    return "1 6";
  }

  return undefined;
}

function getTextJustifyContent(textAlign: "center" | "left" | "right") {
  if (textAlign === "left") {
    return "flex-start";
  }

  if (textAlign === "right") {
    return "flex-end";
  }

  return "center";
}

function getVerticalAlignItems(verticalAlign: ProjectObjectTextVerticalAlign) {
  if (verticalAlign === "top") {
    return "flex-start";
  }

  if (verticalAlign === "bottom") {
    return "flex-end";
  }

  return "center";
}
