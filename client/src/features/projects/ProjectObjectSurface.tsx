import type {
  ProjectObjectAppearance,
  ProjectObjectBorderStyle,
  ProjectObjectNode,
  ProjectObjectShapeVariant,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import type { CSSProperties } from "react";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeImage,
  getProjectObjectNodeShape,
  getProjectObjectNodeText
} from "./project-object-tree";
import { ProjectObjectKindIcon } from "./project-object-tree-ui";
import type { ProjectImageAssetOption } from "./project-image-assets";

type ProjectObjectSurfaceProps = {
  imageAssetById: Map<string, ProjectImageAssetOption>;
  object: ProjectObjectNode;
};

export function ProjectObjectSurface({ imageAssetById, object }: ProjectObjectSurfaceProps) {
  if (object.kind === "card") {
    return <CardVisual object={object} />;
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

  return <ShapeVisual object={object} />;
}

type ObjectVisualProps = {
  object: ProjectObjectNode;
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

type ShapeSvgElementProps = {
  borderRadius: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
  variant: ProjectObjectShapeVariant;
};

function ShapeSvgElement({
  borderRadius,
  fill,
  fillOpacity,
  stroke,
  strokeDasharray,
  strokeWidth,
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
