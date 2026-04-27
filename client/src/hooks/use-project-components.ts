import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createCardTemplate,
  createComponent,
  deleteCardTemplate,
  deleteComponent,
  getApiErrorMessage,
  getCardTemplates,
  getComponents,
  updateCardTemplate,
  updateComponent
} from "../api/client";
import type { ComponentFormSubmitValues } from "./use-component-form";
import {
  createDefaultCardLayout,
  getFirstCardSideText,
  type CardLayout,
  type CardTemplate,
  type ComponentType,
  type CreateGameComponentInput,
  type GameComponent,
  type UpdateGameComponentInput
} from "@bg-maker/shared";

export type ComponentModalState =
  | { mode: "create" }
  | { mode: "createTemplate" }
  | { component: GameComponent; mode: "edit" }
  | { mode: "editTemplate"; template: CardTemplate }
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
  const cardTemplatesQuery = useQuery({
    queryKey: ["card-templates", projectId],
    queryFn: () => getCardTemplates(projectId),
    enabled: projectId.length > 0,
    retry: false
  });

  const components = useMemo(() => componentsQuery.data ?? [], [componentsQuery.data]);
  const cardTemplates = useMemo(
    () => cardTemplatesQuery.data ?? [],
    [cardTemplatesQuery.data]
  );
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
  const editingCardTemplate =
    componentModal?.mode === "editTemplate" ? componentModal.template : undefined;

  async function refreshProjectComponents() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["components", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["card-templates", projectId] }),
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
  const createCardTemplateMutation = useMutation({
    mutationFn: (values: { layout: CardLayout; name: string }) =>
      createCardTemplate(projectId, values)
  });
  const updateCardTemplateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { layout: CardLayout; name: string } }) =>
      updateCardTemplate(projectId, id, values)
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
  const deleteCardTemplateMutation = useMutation({
    mutationFn: (templateId: string) => deleteCardTemplate(projectId, templateId),
    onSuccess: refreshProjectComponents
  });

  function openNewComponent() {
    createComponentMutation.reset();
    setComponentModal({ mode: "create" });
  }

  function openNewCardTemplate() {
    createCardTemplateMutation.reset();
    updateCardTemplateMutation.reset();
    setComponentModal({ mode: "createTemplate" });
  }

  function openEditComponent(component: GameComponent) {
    updateComponentMutation.reset();
    setComponentModal({ mode: "edit", component });
  }

  function openEditCardTemplate(template: CardTemplate) {
    updateCardTemplateMutation.reset();
    setComponentModal({ mode: "editTemplate", template });
  }

  function closeComponentModal() {
    createComponentMutation.reset();
    updateComponentMutation.reset();
    createCardTemplateMutation.reset();
    updateCardTemplateMutation.reset();
    setComponentModal(null);
  }

  function submitComponentForm(values: ComponentFormSubmitValues) {
    void submitComponentFormAsync(values);
  }

  async function submitComponentFormAsync(values: ComponentFormSubmitValues) {
    if (values.kind === "cardTemplate") {
      if (values.cardTemplate.id) {
        await updateCardTemplateMutation.mutateAsync({
          id: values.cardTemplate.id,
          values: {
            name: values.cardTemplate.name,
            layout: values.cardTemplate.layout
          }
        });
      } else {
        await createCardTemplateMutation.mutateAsync({
          name: values.cardTemplate.name,
          layout: values.cardTemplate.layout
        });
      }

      await refreshProjectComponents();
      setComponentModal(null);
      return;
    }

    if (componentModal?.mode === "edit" && editingComponent) {
      await updateComponentMutation.mutateAsync({
        componentId: editingComponent.id,
        values: values.component as UpdateGameComponentInput
      });
      return;
    }

    await createComponentMutation.mutateAsync(values.component as CreateGameComponentInput);
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

  function requestDeleteCardTemplate(template: CardTemplate) {
    deleteCardTemplateMutation.reset();

    if (window.confirm(`Delete card template "${template.name}"?`)) {
      deleteCardTemplateMutation.mutate(template.id);
    }
  }

  const formError =
    createCardTemplateMutation.error
      ? getApiErrorMessage(createCardTemplateMutation.error)
      : updateCardTemplateMutation.error
        ? getApiErrorMessage(updateCardTemplateMutation.error)
        : componentModal?.mode === "create" && createComponentMutation.error
      ? getApiErrorMessage(createComponentMutation.error)
      : componentModal?.mode === "edit" && updateComponentMutation.error
        ? getApiErrorMessage(updateComponentMutation.error)
        : null;
  const actionError = deleteComponentMutation.error
    ? getApiErrorMessage(deleteComponentMutation.error)
    : deleteCardTemplateMutation.error
      ? getApiErrorMessage(deleteCardTemplateMutation.error)
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
    deletingCardTemplateId: deleteCardTemplateMutation.isPending
      ? (deleteCardTemplateMutation.variables ?? null)
      : null,
    duplicateComponent,
    editingComponent,
    editingCardTemplate,
    filteredComponents,
    formError,
    formIsPending:
      createComponentMutation.isPending ||
      updateComponentMutation.isPending ||
      createCardTemplateMutation.isPending ||
      updateCardTemplateMutation.isPending,
    getComponentDetails: (component: GameComponent) =>
      getComponentDetails(component, componentsById),
    cardTemplates,
    cardTemplatesQuery,
    openEditComponent,
    openEditCardTemplate,
    openNewCardTemplate,
    openNewComponent,
    queryError: componentsQuery.error ? getApiErrorMessage(componentsQuery.error) : null,
    requestDeleteCardTemplate,
    requestDeleteComponent,
    setComponentTypeFilter,
    submitComponentForm
  };
}

function getComponentDetails(component: GameComponent, componentsById: Map<string, GameComponent>) {
  switch (component.type) {
    case "card":
      return [
        formatCardSize(component.layout),
        getFirstCardSideText(component.layout.sides.front) ||
          component.frontText ||
          component.defaultVisibility
      ].join(" - ");

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
        defaultVisibility: component.defaultVisibility,
        templateId: component.templateId,
        fieldValues: { ...component.fieldValues },
        layout: cloneCardLayout(
          component.layout ??
            createDefaultCardLayout({
              frontText: component.frontText,
              backText: component.backText
            })
        )
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

function formatCardSize(layout: CardLayout) {
  return `${layout.size.widthMm} x ${layout.size.heightMm} mm`;
}

function cloneCardLayout(layout: CardLayout) {
  return JSON.parse(JSON.stringify(layout)) as CardLayout;
}
