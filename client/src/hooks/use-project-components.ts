import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createComponent,
  deleteComponent,
  getApiErrorMessage,
  getComponents,
  updateComponent
} from "../api/client";
import type { ComponentFormSubmitValues } from "./use-component-form";
import {
  type ComponentType,
  type CreateGameComponentInput,
  type GameComponent,
  type UpdateGameComponentInput
} from "@bg-maker/shared";

export type ComponentModalState =
  | { mode: "create" }
  | { component: GameComponent; mode: "edit" }
  | null;

export function useProjectComponents(projectId: string) {
  const queryClient = useQueryClient();
  const [componentModal, setComponentModal] = useState<ComponentModalState>(null);
  const [componentTypeFilter, setComponentTypeFilter] = useState<ComponentType | "all">("all");

  const componentsQuery = useQuery({
    queryKey: ["components", projectId],
    queryFn: () => getComponents(projectId),
    enabled: projectId.length > 0,
    retry: false
  });

  const components = useMemo(() => componentsQuery.data ?? [], [componentsQuery.data]);
  const filteredComponents = useMemo(
    () =>
      componentTypeFilter === "all"
        ? components
        : components.filter((component) => component.type === componentTypeFilter),
    [componentTypeFilter, components]
  );
  const componentsById = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components]
  );
  const editingComponent = componentModal?.mode === "edit" ? componentModal.component : undefined;

  async function refreshProjectComponents() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["components", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    ]);
  }

  const createComponentMutation = useMutation({
    mutationFn: (values: CreateGameComponentInput) => createComponent(projectId, values),
    onSuccess: async () => {
      await refreshProjectComponents();
      setComponentModal(null);
    }
  });

  const updateComponentMutation = useMutation({
    mutationFn: ({
      componentId,
      values
    }: {
      componentId: string;
      values: UpdateGameComponentInput;
    }) => updateComponent(projectId, componentId, values),
    onSuccess: async () => {
      await refreshProjectComponents();
      setComponentModal(null);
    }
  });

  const duplicateComponentMutation = useMutation({
    mutationFn: (component: GameComponent) =>
      createComponent(projectId, toDuplicateInput(component)),
    onSuccess: refreshProjectComponents
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (componentId: string) => deleteComponent(projectId, componentId),
    onSuccess: refreshProjectComponents
  });

  function openNewComponent() {
    createComponentMutation.reset();
    setComponentModal({ mode: "create" });
  }

  function openEditComponent(component: GameComponent) {
    updateComponentMutation.reset();
    setComponentModal({ mode: "edit", component });
  }

  function closeComponentModal() {
    createComponentMutation.reset();
    updateComponentMutation.reset();
    setComponentModal(null);
  }

  function submitComponentForm(values: ComponentFormSubmitValues) {
    if (componentModal?.mode === "edit" && editingComponent) {
      updateComponentMutation.mutate({
        componentId: editingComponent.id,
        values: values as UpdateGameComponentInput
      });
      return;
    }

    createComponentMutation.mutate(values as CreateGameComponentInput);
  }

  function duplicateComponent(component: GameComponent) {
    duplicateComponentMutation.reset();
    duplicateComponentMutation.mutate(component);
  }

  function requestDeleteComponent(component: GameComponent) {
    deleteComponentMutation.reset();

    if (window.confirm(`Delete "${component.name}"?`)) {
      deleteComponentMutation.mutate(component.id);
    }
  }

  const formError =
    componentModal?.mode === "create" && createComponentMutation.error
      ? getApiErrorMessage(createComponentMutation.error)
      : componentModal?.mode === "edit" && updateComponentMutation.error
        ? getApiErrorMessage(updateComponentMutation.error)
        : null;
  const actionError = deleteComponentMutation.error
    ? getApiErrorMessage(deleteComponentMutation.error)
    : duplicateComponentMutation.error
      ? getApiErrorMessage(duplicateComponentMutation.error)
      : null;

  return {
    actionError,
    closeComponentModal,
    componentModal,
    componentTypeFilter,
    components,
    componentsById,
    componentsQuery,
    deletingComponentId: deleteComponentMutation.isPending
      ? (deleteComponentMutation.variables ?? null)
      : null,
    duplicatingComponentId: duplicateComponentMutation.isPending
      ? (duplicateComponentMutation.variables?.id ?? null)
      : null,
    duplicateComponent,
    editingComponent,
    filteredComponents,
    formError,
    formIsPending: createComponentMutation.isPending || updateComponentMutation.isPending,
    getComponentDetails: (component: GameComponent) =>
      getComponentDetails(component, componentsById),
    openEditComponent,
    openNewComponent,
    queryError: componentsQuery.error ? getApiErrorMessage(componentsQuery.error) : null,
    requestDeleteComponent,
    setComponentTypeFilter,
    submitComponentForm
  };
}

function getComponentDetails(component: GameComponent, componentsById: Map<string, GameComponent>) {
  switch (component.type) {
    case "card":
      return component.frontText || component.backText || component.defaultVisibility;

    case "deck": {
      const totalCards = component.cards.reduce((total, entry) => total + entry.quantity, 0);
      const cardNames = component.cards
        .map((entry) => {
          const card = componentsById.get(entry.cardId);
          return card ? `${card.name} x${entry.quantity}` : `Missing card x${entry.quantity}`;
        })
        .join(", ");

      return cardNames || `${totalCards} cards`;
    }

    case "die":
      return `${component.sides} sides`;

    case "coin":
      return `${component.headsLabel} / ${component.tailsLabel}`;

    case "marker":
      return component.usage || "Marker";

    case "token":
      return [component.stackable ? "Stackable" : "Single", component.valueLabel]
        .filter(Boolean)
        .join(" - ");
  }
}

function toDuplicateInput(component: GameComponent): CreateGameComponentInput {
  const base = {
    type: component.type,
    name: `Copy of ${component.name}`,
    quantity: component.quantity,
    description: component.description,
    tags: component.tags,
    notes: component.notes
  };

  switch (component.type) {
    case "card":
      return {
        ...base,
        type: "card",
        frontText: component.frontText,
        backText: component.backText,
        defaultVisibility: component.defaultVisibility
      };

    case "deck":
      return {
        ...base,
        type: "deck",
        cards: component.cards.map((entry) => ({ ...entry })),
        shuffleOnSetup: component.shuffleOnSetup,
        defaultVisibility: component.defaultVisibility
      };

    case "die":
      return {
        ...base,
        type: "die",
        sides: component.sides
      };

    case "coin":
      return {
        ...base,
        type: "coin",
        headsLabel: component.headsLabel,
        tailsLabel: component.tailsLabel
      };

    case "marker":
      return {
        ...base,
        type: "marker",
        usage: component.usage
      };

    case "token":
      return {
        ...base,
        type: "token",
        stackable: component.stackable,
        valueLabel: component.valueLabel
      };
  }
}
