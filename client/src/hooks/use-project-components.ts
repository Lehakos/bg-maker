import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createCardTemplate,
  createCollection,
  createComponent,
  createPieceTemplate,
  createTileTemplate,
  deleteCardTemplate,
  deleteCollection,
  deleteComponent,
  deletePieceTemplate,
  deleteTileTemplate,
  getApiErrorMessage,
  getCardTemplates,
  getCollections,
  getComponents,
  getPieceTemplates,
  getTileTemplates,
  updateCardTemplate,
  updateCollection,
  updateComponent,
  updatePieceTemplate,
  updateTileTemplate
} from "../api/client";
import type { ComponentFormSubmitValues } from "./use-component-form";
import {
  createDefaultCardLayout,
  createDefaultPieceLayout,
  createDefaultTileLayout,
  getFirstCardSideText,
  getFirstPieceFaceText,
  getFirstTileSideText,
  type CardLayout,
  type CardTemplate,
  type ComponentCollection,
  type ComponentType,
  type CreateComponentCollectionInput,
  type CreateGameComponentInput,
  type CreatePieceTemplateInput,
  type CreateTileTemplateInput,
  type GameComponent,
  type PieceLayout,
  type PieceTemplate,
  type TileLayout,
  type TileTemplate,
  type UpdateComponentCollectionInput,
  type UpdateGameComponentInput,
  type UpdatePieceTemplateInput,
  type UpdateTileTemplateInput
} from "@bg-maker/shared";

export type ComponentModalState =
  | { mode: "create"; type?: ComponentType }
  | { mode: "createCollection" }
  | { mode: "createPieceTemplate" }
  | { mode: "createTileTemplate" }
  | { mode: "createTemplate" }
  | { collection: ComponentCollection; mode: "editCollection" }
  | { component: GameComponent; mode: "edit" }
  | { mode: "editPieceTemplate"; template: PieceTemplate }
  | { mode: "editTileTemplate"; template: TileTemplate }
  | { mode: "editTemplate"; template: CardTemplate }
  | null;

export function useProjectComponents(projectId: string) {
  const queryClient = useQueryClient();
  const [componentModal, setComponentModal] = useState<ComponentModalState>(null);

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
  const pieceTemplatesQuery = useQuery({
    queryKey: ["piece-templates", projectId],
    queryFn: () => getPieceTemplates(projectId),
    enabled: projectId.length > 0,
    retry: false
  });
  const tileTemplatesQuery = useQuery({
    queryKey: ["tile-templates", projectId],
    queryFn: () => getTileTemplates(projectId),
    enabled: projectId.length > 0,
    retry: false
  });
  const collectionsQuery = useQuery({
    queryKey: ["collections", projectId],
    queryFn: () => getCollections(projectId),
    enabled: projectId.length > 0,
    retry: false
  });

  const components = useMemo(() => componentsQuery.data ?? [], [componentsQuery.data]);
  const cardTemplates = useMemo(() => cardTemplatesQuery.data ?? [], [cardTemplatesQuery.data]);
  const pieceTemplates = useMemo(() => pieceTemplatesQuery.data ?? [], [pieceTemplatesQuery.data]);
  const tileTemplates = useMemo(() => tileTemplatesQuery.data ?? [], [tileTemplatesQuery.data]);
  const collections = useMemo(() => collectionsQuery.data ?? [], [collectionsQuery.data]);
  const componentsById = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components]
  );
  const editingComponent = componentModal?.mode === "edit" ? componentModal.component : undefined;
  const editingCardTemplate =
    componentModal?.mode === "editTemplate" ? componentModal.template : undefined;
  const editingPieceTemplate =
    componentModal?.mode === "editPieceTemplate" ? componentModal.template : undefined;
  const editingTileTemplate =
    componentModal?.mode === "editTileTemplate" ? componentModal.template : undefined;
  const editingCollection =
    componentModal?.mode === "editCollection" ? componentModal.collection : undefined;

  async function refreshProjectComponents() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["components", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["card-templates", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["piece-templates", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["tile-templates", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["collections", projectId] }),
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

  const createCardTemplateMutation = useMutation({
    mutationFn: (values: { layout: CardLayout; name: string }) =>
      createCardTemplate(projectId, values)
  });
  const updateCardTemplateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { layout: CardLayout; name: string } }) =>
      updateCardTemplate(projectId, id, values)
  });
  const deleteCardTemplateMutation = useMutation({
    mutationFn: (templateId: string) => deleteCardTemplate(projectId, templateId),
    onSuccess: refreshProjectComponents
  });

  const createTileTemplateMutation = useMutation({
    mutationFn: (values: CreateTileTemplateInput) => createTileTemplate(projectId, values)
  });
  const updateTileTemplateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateTileTemplateInput }) =>
      updateTileTemplate(projectId, id, values)
  });
  const deleteTileTemplateMutation = useMutation({
    mutationFn: (templateId: string) => deleteTileTemplate(projectId, templateId),
    onSuccess: refreshProjectComponents
  });

  const createPieceTemplateMutation = useMutation({
    mutationFn: (values: CreatePieceTemplateInput) => createPieceTemplate(projectId, values)
  });
  const updatePieceTemplateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdatePieceTemplateInput }) =>
      updatePieceTemplate(projectId, id, values)
  });
  const deletePieceTemplateMutation = useMutation({
    mutationFn: (templateId: string) => deletePieceTemplate(projectId, templateId),
    onSuccess: refreshProjectComponents
  });

  const createCollectionMutation = useMutation({
    mutationFn: (values: CreateComponentCollectionInput) => createCollection(projectId, values)
  });
  const updateCollectionMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateComponentCollectionInput }) =>
      updateCollection(projectId, id, values)
  });
  const deleteCollectionMutation = useMutation({
    mutationFn: (collectionId: string) => deleteCollection(projectId, collectionId),
    onSuccess: refreshProjectComponents
  });

  function openNewComponent(type?: ComponentType) {
    createComponentMutation.reset();
    setComponentModal({ mode: "create", type });
  }

  function openNewCardTemplate() {
    createCardTemplateMutation.reset();
    updateCardTemplateMutation.reset();
    setComponentModal({ mode: "createTemplate" });
  }

  function openNewPieceTemplate() {
    createPieceTemplateMutation.reset();
    updatePieceTemplateMutation.reset();
    setComponentModal({ mode: "createPieceTemplate" });
  }

  function openNewTileTemplate() {
    createTileTemplateMutation.reset();
    updateTileTemplateMutation.reset();
    setComponentModal({ mode: "createTileTemplate" });
  }

  function openNewCollection() {
    createCollectionMutation.reset();
    updateCollectionMutation.reset();
    setComponentModal({ mode: "createCollection" });
  }

  function openEditComponent(component: GameComponent) {
    updateComponentMutation.reset();
    setComponentModal({ mode: "edit", component });
  }

  function openEditCardTemplate(template: CardTemplate) {
    updateCardTemplateMutation.reset();
    setComponentModal({ mode: "editTemplate", template });
  }

  function openEditPieceTemplate(template: PieceTemplate) {
    updatePieceTemplateMutation.reset();
    setComponentModal({ mode: "editPieceTemplate", template });
  }

  function openEditTileTemplate(template: TileTemplate) {
    updateTileTemplateMutation.reset();
    setComponentModal({ mode: "editTileTemplate", template });
  }

  function openEditCollection(collection: ComponentCollection) {
    updateCollectionMutation.reset();
    setComponentModal({ mode: "editCollection", collection });
  }

  function closeComponentModal() {
    createComponentMutation.reset();
    updateComponentMutation.reset();
    createCardTemplateMutation.reset();
    updateCardTemplateMutation.reset();
    createTileTemplateMutation.reset();
    updateTileTemplateMutation.reset();
    createPieceTemplateMutation.reset();
    updatePieceTemplateMutation.reset();
    createCollectionMutation.reset();
    updateCollectionMutation.reset();
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

    if (values.kind === "pieceTemplate") {
      if (values.pieceTemplate.id) {
        await updatePieceTemplateMutation.mutateAsync({
          id: values.pieceTemplate.id,
          values: {
            name: values.pieceTemplate.name,
            layout: values.pieceTemplate.layout
          }
        });
      } else {
        await createPieceTemplateMutation.mutateAsync({
          name: values.pieceTemplate.name,
          layout: values.pieceTemplate.layout
        });
      }

      await refreshProjectComponents();
      setComponentModal(null);
      return;
    }

    if (values.kind === "tileTemplate") {
      if (values.tileTemplate.id) {
        await updateTileTemplateMutation.mutateAsync({
          id: values.tileTemplate.id,
          values: {
            name: values.tileTemplate.name,
            layout: values.tileTemplate.layout
          }
        });
      } else {
        await createTileTemplateMutation.mutateAsync({
          name: values.tileTemplate.name,
          layout: values.tileTemplate.layout
        });
      }

      await refreshProjectComponents();
      setComponentModal(null);
      return;
    }

    if (values.kind === "collection") {
      if (values.collection.id) {
        await updateCollectionMutation.mutateAsync({
          id: values.collection.id,
          values: values.collection
        });
      } else {
        await createCollectionMutation.mutateAsync(values.collection);
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

  function requestDeletePieceTemplate(template: PieceTemplate) {
    deletePieceTemplateMutation.reset();

    if (window.confirm(`Delete piece template "${template.name}"?`)) {
      deletePieceTemplateMutation.mutate(template.id);
    }
  }

  function requestDeleteTileTemplate(template: TileTemplate) {
    deleteTileTemplateMutation.reset();

    if (window.confirm(`Delete tile template "${template.name}"?`)) {
      deleteTileTemplateMutation.mutate(template.id);
    }
  }

  function requestDeleteCollection(collection: ComponentCollection) {
    deleteCollectionMutation.reset();

    if (window.confirm(`Delete collection "${collection.name}"?`)) {
      deleteCollectionMutation.mutate(collection.id);
    }
  }

  const formError = getFirstError(
    createCardTemplateMutation.error,
    updateCardTemplateMutation.error,
    createTileTemplateMutation.error,
    updateTileTemplateMutation.error,
    createPieceTemplateMutation.error,
    updatePieceTemplateMutation.error,
    createCollectionMutation.error,
    updateCollectionMutation.error,
    componentModal?.mode === "create" ? createComponentMutation.error : null,
    componentModal?.mode === "edit" ? updateComponentMutation.error : null
  );
  const actionError = getFirstError(
    deleteComponentMutation.error,
    deleteCardTemplateMutation.error,
    deleteTileTemplateMutation.error,
    deletePieceTemplateMutation.error,
    deleteCollectionMutation.error,
    duplicateComponentMutation.error
  );

  return {
    actionError,
    cardTemplates,
    cardTemplatesQuery,
    closeComponentModal,
    collections,
    collectionsQuery,
    componentModal,
    components,
    componentsById,
    componentsQuery,
    deletingCardTemplateId: deleteCardTemplateMutation.isPending
      ? (deleteCardTemplateMutation.variables ?? null)
      : null,
    deletingTileTemplateId: deleteTileTemplateMutation.isPending
      ? (deleteTileTemplateMutation.variables ?? null)
      : null,
    deletingCollectionId: deleteCollectionMutation.isPending
      ? (deleteCollectionMutation.variables ?? null)
      : null,
    deletingComponentId: deleteComponentMutation.isPending
      ? (deleteComponentMutation.variables ?? null)
      : null,
    deletingPieceTemplateId: deletePieceTemplateMutation.isPending
      ? (deletePieceTemplateMutation.variables ?? null)
      : null,
    duplicateComponent,
    duplicatingComponentId: duplicateComponentMutation.isPending
      ? (duplicateComponentMutation.variables?.id ?? null)
      : null,
    editingCardTemplate,
    editingCollection,
    editingComponent,
    editingPieceTemplate,
    editingTileTemplate,
    formError,
    formIsPending:
      createComponentMutation.isPending ||
      updateComponentMutation.isPending ||
      createCardTemplateMutation.isPending ||
      updateCardTemplateMutation.isPending ||
      createTileTemplateMutation.isPending ||
      updateTileTemplateMutation.isPending ||
      createPieceTemplateMutation.isPending ||
      updatePieceTemplateMutation.isPending ||
      createCollectionMutation.isPending ||
      updateCollectionMutation.isPending,
    getCollectionDetails: (collection: ComponentCollection) =>
      getCollectionDetails(collection, componentsById),
    getComponentDetails,
    openEditCardTemplate,
    openEditCollection,
    openEditComponent,
    openEditPieceTemplate,
    openEditTileTemplate,
    openNewCardTemplate,
    openNewCollection,
    openNewComponent,
    openNewPieceTemplate,
    openNewTileTemplate,
    pieceTemplates,
    pieceTemplatesQuery,
    queryError: getFirstError(
      componentsQuery.error,
      cardTemplatesQuery.error,
      tileTemplatesQuery.error,
      pieceTemplatesQuery.error,
      collectionsQuery.error
    ),
    requestDeleteCardTemplate,
    requestDeleteCollection,
    requestDeleteComponent,
    requestDeletePieceTemplate,
    requestDeleteTileTemplate,
    submitComponentForm,
    tileTemplates,
    tileTemplatesQuery
  };
}

function getFirstError(...errors: unknown[]) {
  const error = errors.find(Boolean);
  return error ? getApiErrorMessage(error) : null;
}

function getComponentDetails(component: GameComponent) {
  switch (component.type) {
    case "card":
      return [
        formatCardSize(component.layout),
        getFirstCardSideText(component.layout.sides.front) || component.frontText
      ]
        .filter(Boolean)
        .join(" - ");

    case "tile":
      return [
        `${component.layout.shape} tile`,
        formatTileSize(component.layout),
        component.layout.rotationDeg ? `${component.layout.rotationDeg} deg` : "",
        getFirstTileSideText(component.layout) || component.labelText
      ]
        .filter(Boolean)
        .join(" - ");

    case "piece":
      return [
        `${component.layout.formFactor} ${component.layout.shape}`,
        formatPieceSize(component.layout),
        getFirstPieceFaceText(component.layout) || component.labelText
      ]
        .filter(Boolean)
        .join(" - ");

    case "die":
      return `${component.sides} sides`;
  }
}

function getCollectionDetails(
  collection: ComponentCollection,
  componentsById: Map<string, GameComponent>
) {
  return (
    collection.items
      .map((entry) => {
        const component = componentsById.get(entry.componentId);
        return component
          ? `${component.name} x${entry.quantity}`
          : `Missing component x${entry.quantity}`;
      })
      .join(", ") || "Empty collection"
  );
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

    case "tile":
      return {
        ...base,
        type: "tile",
        labelText: component.labelText,
        templateId: component.templateId,
        fieldValues: { ...component.fieldValues },
        layout: cloneTileLayout(component.layout ?? createDefaultTileLayout())
      };

    case "piece":
      return {
        ...base,
        type: "piece",
        labelText: component.labelText,
        templateId: component.templateId,
        appearance: { ...component.appearance },
        fieldValues: { ...component.fieldValues },
        layout: clonePieceLayout(component.layout ?? createDefaultPieceLayout())
      };

    case "die":
      return {
        ...base,
        type: "die",
        sides: component.sides
      };
  }
}

function formatCardSize(layout: CardLayout) {
  return `${layout.size.widthMm} x ${layout.size.heightMm} mm`;
}

function formatPieceSize(layout: PieceLayout) {
  return `${layout.sizeMm.widthMm} x ${layout.sizeMm.heightMm} x ${layout.sizeMm.depthMm} mm`;
}

function formatTileSize(layout: TileLayout) {
  return `${layout.sizeMm.widthMm} x ${layout.sizeMm.heightMm} mm`;
}

function cloneCardLayout(layout: CardLayout) {
  return JSON.parse(JSON.stringify(layout)) as CardLayout;
}

function cloneTileLayout(layout: TileLayout) {
  return JSON.parse(JSON.stringify(layout)) as TileLayout;
}

function clonePieceLayout(layout: PieceLayout) {
  return JSON.parse(JSON.stringify(layout)) as PieceLayout;
}
