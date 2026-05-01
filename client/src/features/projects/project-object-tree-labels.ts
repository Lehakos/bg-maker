import type { ProjectObjectKind } from "@bg-maker/shared";

export function getProjectObjectKindIconClassName(kind: ProjectObjectKind) {
  if (kind === "card") {
    return "text-rose-600";
  }

  if (kind === "deck") {
    return "text-indigo-600";
  }

  if (kind === "token") {
    return "text-emerald-600";
  }

  if (kind === "zone") {
    return "text-cyan-700";
  }

  if (kind === "counter") {
    return "text-amber-700";
  }

  if (kind === "die") {
    return "text-violet-600";
  }

  if (kind === "label") {
    return "text-slate-600";
  }

  if (kind === "image") {
    return "text-sky-600";
  }

  return "text-teal-700";
}

export function getProjectObjectKindLabel(kind: ProjectObjectKind) {
  if (kind === "card") {
    return "Card";
  }

  if (kind === "deck") {
    return "Deck";
  }

  if (kind === "token") {
    return "Token";
  }

  if (kind === "zone") {
    return "Zone";
  }

  if (kind === "counter") {
    return "Counter";
  }

  if (kind === "die") {
    return "Die";
  }

  if (kind === "label") {
    return "Label";
  }

  if (kind === "image") {
    return "Image";
  }

  return "Group";
}
