import { useCallback, useEffect, useState } from "react";

export type ResizablePanelAxis = "horizontal" | "vertical";
export type ResizablePanelEdge = "bottom" | "left" | "right" | "top";

export type ResizablePanelSizeBounds = {
  minSize: number;
  maxSize: number;
};

type UseResizablePanelSizeOptions = ResizablePanelSizeBounds & {
  defaultSize: number;
  storageKey?: string;
};

type PointerDeltaSizeOptions = ResizablePanelSizeBounds & {
  edge: ResizablePanelEdge;
  pointerDelta: number;
  startSize: number;
};

type ElementSize = {
  height: number;
  width: number;
};

export function useResizablePanelSize({
  defaultSize,
  maxSize,
  minSize,
  storageKey
}: UseResizablePanelSizeOptions) {
  const [size, setSize] = useState(() =>
    normalizeResizablePanelSize(readStoredPanelSize(storageKey) ?? defaultSize, { maxSize, minSize })
  );

  return [
    size,
    useCallback(
      (nextSize: number) => {
        const normalizedSize = normalizeResizablePanelSize(nextSize, { maxSize, minSize });

        setSize(normalizedSize);
        writeStoredPanelSize(storageKey, normalizedSize);
      },
      [maxSize, minSize, storageKey]
    )
  ] as const;
}

export function useElementSize<TElement extends HTMLElement>() {
  const [element, setElement] = useState<TElement | null>(null);
  const [size, setSize] = useState<ElementSize>({ height: 0, width: 0 });

  useEffect(() => {
    if (!element) {
      return;
    }

    const observedElement = element;

    function updateElementSize() {
      setSize({
        height: observedElement.clientHeight,
        width: observedElement.clientWidth
      });
    }

    const initialMeasureFrame = window.requestAnimationFrame(updateElementSize);

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateElementSize);

      return () => {
        window.cancelAnimationFrame(initialMeasureFrame);
        window.removeEventListener("resize", updateElementSize);
      };
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const contentRect = entries[0]?.contentRect;

      if (!contentRect) {
        updateElementSize();
        return;
      }

      setSize({
        height: contentRect.height,
        width: contentRect.width
      });
    });

    resizeObserver.observe(observedElement);

    return () => {
      window.cancelAnimationFrame(initialMeasureFrame);
      resizeObserver.disconnect();
    };
  }, [element]);

  return [setElement, size] as const;
}

export function normalizeResizablePanelSize(size: number, bounds: ResizablePanelSizeBounds) {
  const normalizedBounds = getNormalizedPanelSizeBounds(bounds);

  if (!Number.isFinite(size)) {
    return normalizedBounds.minSize;
  }

  return Math.min(Math.max(size, normalizedBounds.minSize), normalizedBounds.maxSize);
}

export function getResizablePanelSizeFromPointerDelta({
  edge,
  maxSize,
  minSize,
  pointerDelta,
  startSize
}: PointerDeltaSizeOptions) {
  const sizeDelta = edge === "right" || edge === "bottom" ? pointerDelta : -pointerDelta;

  return normalizeResizablePanelSize(startSize + sizeDelta, { maxSize, minSize });
}

export function getNormalizedPanelSizeBounds({ maxSize, minSize }: ResizablePanelSizeBounds) {
  const safeMinSize = Number.isFinite(minSize) ? Math.max(0, minSize) : 0;
  const safeMaxSize = Number.isFinite(maxSize) ? maxSize : safeMinSize;

  return {
    minSize: safeMinSize,
    maxSize: Math.max(safeMinSize, safeMaxSize)
  };
}

function readStoredPanelSize(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") {
    return null;
  }

  let storedValue: string | null;

  try {
    storedValue = window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }

  if (!storedValue) {
    return null;
  }

  const parsedValue = Number(storedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function writeStoredPanelSize(storageKey: string | undefined, size: number) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, String(Math.round(size)));
  } catch {
    // Persisting panel sizes is a convenience; resizing should still work without storage.
  }
}
