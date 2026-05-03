import type { ProjectObjectKind } from "@bg-maker/shared";

const projectObjectKindIconClassNames: Record<ProjectObjectKind, string> = {
  bag: "text-violet-700",
  card: "text-rose-600",
  counter: "text-blue-600",
  deck: "text-sky-700",
  die: "text-amber-600",
  group: "text-teal-700",
  image: "text-sky-600",
  label: "text-slate-600",
  shape: "text-emerald-600",
  token: "text-orange-600",
  zone: "text-cyan-600"
};

const projectObjectKindLabels: Record<ProjectObjectKind, string> = {
  bag: "Bag",
  card: "Card",
  counter: "Counter",
  deck: "Deck",
  die: "Die",
  group: "Group",
  image: "Image",
  label: "Label",
  shape: "Shape",
  token: "Token",
  zone: "Zone"
};

export function getProjectObjectKindIconClassName(kind: ProjectObjectKind) {
  return projectObjectKindIconClassNames[kind];
}

export function getProjectObjectKindLabel(kind: ProjectObjectKind) {
  return projectObjectKindLabels[kind];
}
