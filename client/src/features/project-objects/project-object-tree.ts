import type {
  ProjectObjectAppearance,
  ProjectObjectBag,
  ProjectObjectImage,
  ProjectFileKind,
  ProjectFileNode,
  ProjectObjectCard,
  ProjectObjectContainer,
  ProjectObjectCounter,
  ProjectObjectDeck,
  ProjectObjectDie,
  ProjectObjectDoubleSide,
  ProjectObjectKind,
  ProjectObjectLayout,
  ProjectObjectMeeple,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectSide,
  ProjectObjectStackDisplay,
  ProjectObjectText,
  ProjectObjectZone
} from "@bg-maker/shared";
import { hasProjectObjectSides } from "@bg-maker/shared";
import { projectObjectComponentEngine } from "./project-object-components";

export type ProjectObjectTreeParentId = string | null;

export type ProjectObjectTreeLocation = {
  node: ProjectObjectNode;
  parentId: ProjectObjectTreeParentId;
  index: number;
  ancestors: string[];
};

const objectTreeFileKinds = new Set<ProjectFileKind>(["tableSetup", "object"]);

type ProjectObjectDoubleSideWithActiveSide = ProjectObjectDoubleSide & {
  activeSide?: ProjectObjectSide;
};

export type ProjectObjectActiveSideResolver = (object: ProjectObjectNode) => ProjectObjectSide;

export function isProjectObjectTreeFileNode(
  node: ProjectFileNode | null | undefined
): node is ProjectFileNode & {
  kind: "tableSetup" | "object";
  objectTree?: ProjectObjectNode[];
  type: "file";
} {
  return node?.type === "file" && objectTreeFileKinds.has(node.kind as ProjectFileKind);
}

export function createProjectObjectNode(
  kind: ProjectObjectKind = "group",
  name?: string
): ProjectObjectNode {
  return projectObjectComponentEngine.createNode(kind, name);
}

export function appendProjectObjectNode(
  objectTree: ProjectObjectNode[],
  parentId: ProjectObjectTreeParentId,
  node: ProjectObjectNode
): ProjectObjectNode[] {
  if (parentId === null) {
    return [...objectTree, node];
  }

  const result = appendProjectObjectNodeInChildren(objectTree, parentId, node);

  return result.changed ? result.nodes : objectTree;
}

export function deleteProjectObjectNode(
  objectTree: ProjectObjectNode[],
  nodeId: string
): ProjectObjectNode[] {
  const result = removeProjectObjectNode(objectTree, nodeId);

  return result.changed ? result.nodes : objectTree;
}

export function findProjectObjectNode(objectTree: ProjectObjectNode[], nodeId: string) {
  return findProjectObjectNodeLocation(objectTree, nodeId)?.node;
}

export function findProjectObjectNodeLocation(
  objectTree: ProjectObjectNode[],
  nodeId: string
): ProjectObjectTreeLocation | undefined {
  return findProjectObjectNodeLocationInChildren(objectTree, nodeId, null, []);
}

export function getProjectObjectNodeChildren(
  objectTree: ProjectObjectNode[],
  parentId: ProjectObjectTreeParentId
) {
  if (parentId === null) {
    return objectTree;
  }

  return findProjectObjectNode(objectTree, parentId)?.children ?? [];
}

export function getProjectObjectNodeVisibleChildren(object: ProjectObjectNode) {
  const children = object.children ?? [];

  if (!hasProjectObjectSides(object.kind)) {
    return children;
  }

  const activeSide = getProjectObjectNodeActiveSide(object);

  return children.filter((child) => child.parentSide === activeSide);
}

export function getExpandableProjectObjectNodeIds(objectTree: ProjectObjectNode[]) {
  const expandableIds = new Set<string>();

  collectExpandableProjectObjectNodeIds(objectTree, expandableIds);

  return expandableIds;
}

export function moveProjectObjectNode(
  objectTree: ProjectObjectNode[],
  activeId: string,
  targetParentId: ProjectObjectTreeParentId,
  targetIndex: number
) {
  const activeLocation = findProjectObjectNodeLocation(objectTree, activeId);

  if (!activeLocation || activeId === targetParentId) {
    return objectTree;
  }

  if (targetParentId && !findProjectObjectNode(objectTree, targetParentId)) {
    return objectTree;
  }

  if (targetParentId && isProjectObjectNodeDescendant(objectTree, targetParentId, activeId)) {
    return objectTree;
  }

  const adjustedTargetIndex =
    activeLocation.parentId === targetParentId && activeLocation.index < targetIndex
      ? targetIndex - 1
      : targetIndex;

  if (activeLocation.parentId === targetParentId && activeLocation.index === adjustedTargetIndex) {
    return objectTree;
  }

  const removed = removeProjectObjectNode(objectTree, activeId);

  if (!removed.changed) {
    return objectTree;
  }

  const inserted = insertProjectObjectNode(
    removed.nodes,
    targetParentId,
    activeLocation.node,
    adjustedTargetIndex
  );

  return inserted.changed ? inserted.nodes : objectTree;
}

export function renameProjectObjectNode(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  name: string
): ProjectObjectNode[] {
  const result = renameProjectObjectNodeInChildren(objectTree, nodeId, name);

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeVisibility(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  visible: boolean
): ProjectObjectNode[] {
  const result = setProjectObjectNodeVisibilityInChildren(objectTree, nodeId, visible);

  return result.changed ? result.nodes : objectTree;
}

export function getProjectObjectNodeRectTransform(
  object: ProjectObjectNode
): ProjectObjectRectTransform {
  return projectObjectComponentEngine.getRectTransform(object);
}

export function getProjectObjectNodeAppearance(object: ProjectObjectNode): ProjectObjectAppearance {
  return projectObjectComponentEngine.getAppearance(object);
}

export function getProjectObjectNodeBag(object: ProjectObjectNode): ProjectObjectBag {
  return projectObjectComponentEngine.getBag(object);
}

export function getProjectObjectNodeCard(object: ProjectObjectNode): ProjectObjectCard {
  return projectObjectComponentEngine.getCard(object);
}

export function getProjectObjectNodeCounter(object: ProjectObjectNode): ProjectObjectCounter {
  return projectObjectComponentEngine.getCounter(object);
}

export function getProjectObjectNodeContainer(object: ProjectObjectNode): ProjectObjectContainer {
  return projectObjectComponentEngine.getContainer(object);
}

export function getProjectObjectNodeDeck(object: ProjectObjectNode): ProjectObjectDeck {
  return projectObjectComponentEngine.getDeck(object);
}

export function getProjectObjectNodeDie(object: ProjectObjectNode): ProjectObjectDie {
  return projectObjectComponentEngine.getDie(object);
}

export function getProjectObjectNodeDoubleSide(object: ProjectObjectNode): ProjectObjectDoubleSide {
  return projectObjectComponentEngine.getDoubleSide(object);
}

export function getProjectObjectNodeText(object: ProjectObjectNode): ProjectObjectText {
  return projectObjectComponentEngine.getText(object);
}

export function getProjectObjectNodeImage(object: ProjectObjectNode): ProjectObjectImage {
  return projectObjectComponentEngine.getImage(object);
}

export function getProjectObjectNodeLayout(object: ProjectObjectNode): ProjectObjectLayout {
  return projectObjectComponentEngine.getLayout(object);
}

export function getProjectObjectNodeMeeple(object: ProjectObjectNode): ProjectObjectMeeple {
  return projectObjectComponentEngine.getMeeple(object);
}

export function getProjectObjectNodeShape(object: ProjectObjectNode): ProjectObjectShape {
  return projectObjectComponentEngine.getShape(object);
}

export function getProjectObjectNodeStackDisplay(
  object: ProjectObjectNode
): ProjectObjectStackDisplay {
  return projectObjectComponentEngine.getStackDisplay(object);
}

export function getProjectObjectNodeZone(object: ProjectObjectNode): ProjectObjectZone {
  return projectObjectComponentEngine.getZone(object);
}

export function setProjectObjectNodeRectTransform(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  rectTransform: ProjectObjectRectTransform
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withRectTransform(node, rectTransform)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeAppearance(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  appearance: ProjectObjectAppearance
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withAppearance(node, appearance)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeBag(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  bag: ProjectObjectBag
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withBag(node, bag)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeCard(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  card: ProjectObjectCard
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withCard(node, card)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeCounter(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  counter: ProjectObjectCounter
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withCounter(node, counter)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeContainer(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  container: ProjectObjectContainer
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withContainer(node, container)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeDeck(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  deck: ProjectObjectDeck
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withDeck(node, deck)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeDie(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  die: ProjectObjectDie
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withDie(node, die)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeDoubleSide(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  doubleSide: ProjectObjectDoubleSide
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withDoubleSide(node, doubleSide)
  );

  return result.changed ? result.nodes : objectTree;
}

export function getProjectObjectNodeWithActiveSide(
  object: ProjectObjectNode,
  activeSide: ProjectObjectSide
): ProjectObjectNode {
  if (!hasProjectObjectSides(object.kind)) {
    return object;
  }

  const doubleSide = getProjectObjectNodeDoubleSide(object);

  if (getProjectObjectNodeActiveSide(object) === activeSide) {
    return object;
  }

  return projectObjectComponentEngine.withDoubleSide(object, {
    ...doubleSide,
    activeSide
  } as ProjectObjectDoubleSideWithActiveSide);
}

export function getProjectObjectTreeWithActiveSides(
  objectTree: ProjectObjectNode[],
  getActiveSide: ProjectObjectActiveSideResolver
): ProjectObjectNode[] {
  return objectTree.map((node) => getProjectObjectNodeTreeWithActiveSides(node, getActiveSide));
}

export function clearProjectObjectTreeActiveSides(
  objectTree: ProjectObjectNode[]
): ProjectObjectNode[] {
  return objectTree.map(clearProjectObjectNodeActiveSide);
}

export function setProjectObjectNodeText(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  text: ProjectObjectText
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withText(node, text)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeImage(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  image: ProjectObjectImage
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withImage(node, image)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeLayout(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  layout: ProjectObjectLayout
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withLayout(node, layout)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeMeeple(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  meeple: ProjectObjectMeeple
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withMeeple(node, meeple)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeShape(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  shape: ProjectObjectShape
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withShape(node, shape)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeStackDisplay(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  stackDisplay: ProjectObjectStackDisplay
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withStackDisplay(node, stackDisplay)
  );

  return result.changed ? result.nodes : objectTree;
}

export function setProjectObjectNodeZone(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  zone: ProjectObjectZone
): ProjectObjectNode[] {
  const result = updateProjectObjectNodeInChildren(objectTree, nodeId, (node) =>
    projectObjectComponentEngine.withZone(node, zone)
  );

  return result.changed ? result.nodes : objectTree;
}

export function updateProjectFileNodeObjectTree(
  fileTree: ProjectFileNode[],
  fileNodeId: string,
  objectTree: ProjectObjectNode[]
): ProjectFileNode[] {
  const result = updateProjectFileNodeObjectTreeInChildren(fileTree, fileNodeId, objectTree);

  return result.changed ? result.nodes : fileTree;
}

function appendProjectObjectNodeInChildren(
  objectTree: ProjectObjectNode[],
  parentId: string,
  node: ProjectObjectNode
): ProjectObjectTreeUpdateResult {
  let changed = false;
  const nodes = objectTree.map((item) => {
    if (item.id === parentId) {
      changed = true;

      return {
        ...item,
        children: [...(item.children ?? []), getProjectObjectNodeForParent(node, item)]
      };
    }

    const childResult = appendProjectObjectNodeInChildren(item.children ?? [], parentId, node);

    if (childResult.changed) {
      changed = true;

      return {
        ...item,
        children: childResult.nodes
      };
    }

    return item;
  });

  return { changed, nodes };
}

function collectExpandableProjectObjectNodeIds(
  objectTree: ProjectObjectNode[],
  expandableIds: Set<string>
) {
  objectTree.forEach((node) => {
    const children = getProjectObjectNodeVisibleChildren(node);

    if (children.length) {
      expandableIds.add(node.id);
      collectExpandableProjectObjectNodeIds(children, expandableIds);
    }
  });
}

function findProjectObjectNodeLocationInChildren(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  parentId: ProjectObjectTreeParentId,
  ancestors: string[]
): ProjectObjectTreeLocation | undefined {
  for (const [index, node] of objectTree.entries()) {
    if (node.id === nodeId) {
      return {
        node,
        parentId,
        index,
        ancestors
      };
    }

    const childLocation = findProjectObjectNodeLocationInChildren(
      node.children ?? [],
      nodeId,
      node.id,
      [...ancestors, node.id]
    );

    if (childLocation) {
      return childLocation;
    }
  }

  return undefined;
}

function insertAt<T>(items: T[], item: T, index: number) {
  const clampedIndex = Math.max(0, Math.min(index, items.length));

  return [...items.slice(0, clampedIndex), item, ...items.slice(clampedIndex)];
}

function insertProjectObjectNode(
  objectTree: ProjectObjectNode[],
  parentId: ProjectObjectTreeParentId,
  node: ProjectObjectNode,
  index: number
): ProjectObjectTreeUpdateResult {
  if (parentId === null) {
    return {
      changed: true,
      nodes: insertAt(objectTree, clearProjectObjectNodeParentSide(node), index)
    };
  }

  let changed = false;
  const nodes = objectTree.map((item) => {
    if (item.id === parentId) {
      changed = true;

      return {
        ...item,
        children: insertAt(item.children ?? [], getProjectObjectNodeForParent(node, item), index)
      };
    }

    const childResult = insertProjectObjectNode(item.children ?? [], parentId, node, index);

    if (childResult.changed) {
      changed = true;

      return {
        ...item,
        children: childResult.nodes
      };
    }

    return item;
  });

  return { changed, nodes };
}

function clearProjectObjectNodeParentSide(node: ProjectObjectNode): ProjectObjectNode {
  if (!node.parentSide) {
    return node;
  }

  const nextNode = { ...node };
  delete nextNode.parentSide;

  return nextNode;
}

function getProjectObjectNodeForParent(
  node: ProjectObjectNode,
  parent: ProjectObjectNode
): ProjectObjectNode {
  if (!hasProjectObjectSides(parent.kind)) {
    return clearProjectObjectNodeParentSide(node);
  }

  return {
    ...node,
    parentSide: getProjectObjectNodeActiveSide(parent)
  };
}

export function getProjectObjectNodeActiveSide(object: ProjectObjectNode) {
  const activeSide = (object.components?.doubleSide as ProjectObjectDoubleSideWithActiveSide)
    ?.activeSide;

  return activeSide === "back" ? "back" : "front";
}

function getProjectObjectNodeTreeWithActiveSides(
  object: ProjectObjectNode,
  getActiveSide: ProjectObjectActiveSideResolver
): ProjectObjectNode {
  const objectWithActiveSide = hasProjectObjectSides(object.kind)
    ? getProjectObjectNodeWithActiveSide(object, getActiveSide(object))
    : object;
  const children = object.children?.map((child) =>
    getProjectObjectNodeTreeWithActiveSides(child, getActiveSide)
  );

  return children ? { ...objectWithActiveSide, children } : objectWithActiveSide;
}

function clearProjectObjectNodeActiveSide(object: ProjectObjectNode): ProjectObjectNode {
  const children = object.children?.map(clearProjectObjectNodeActiveSide);
  const doubleSide = object.components?.doubleSide as ProjectObjectDoubleSideWithActiveSide;

  if (!doubleSide?.activeSide) {
    return children ? { ...object, children } : object;
  }

  const nextDoubleSide = { ...doubleSide };
  delete nextDoubleSide.activeSide;

  return {
    ...object,
    ...(children ? { children } : {}),
    components: {
      ...object.components,
      doubleSide: nextDoubleSide
    }
  };
}

function isProjectObjectNodeDescendant(
  objectTree: ProjectObjectNode[],
  possibleDescendantId: string,
  nodeId: string
) {
  return (
    findProjectObjectNodeLocation(objectTree, possibleDescendantId)?.ancestors.includes(nodeId) ??
    false
  );
}

function removeProjectObjectNode(
  objectTree: ProjectObjectNode[],
  nodeId: string
): ProjectObjectTreeUpdateResult {
  let changed = false;
  const nodes = objectTree.reduce<ProjectObjectNode[]>((nextNodes, node) => {
    if (node.id === nodeId) {
      changed = true;
      return nextNodes;
    }

    const childResult = removeProjectObjectNode(node.children ?? [], nodeId);

    if (childResult.changed) {
      changed = true;
      nextNodes.push({
        ...node,
        children: childResult.nodes
      });
      return nextNodes;
    }

    nextNodes.push(node);
    return nextNodes;
  }, []);

  return { changed, nodes };
}

function renameProjectObjectNodeInChildren(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  name: string
): ProjectObjectTreeUpdateResult {
  let changed = false;
  const nodes = objectTree.map((node) => {
    if (node.id === nodeId) {
      changed = true;

      return {
        ...node,
        name
      };
    }

    const childResult = renameProjectObjectNodeInChildren(node.children ?? [], nodeId, name);

    if (childResult.changed) {
      changed = true;

      return {
        ...node,
        children: childResult.nodes
      };
    }

    return node;
  });

  return { changed, nodes };
}

function setProjectObjectNodeVisibilityInChildren(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  visible: boolean
): ProjectObjectTreeUpdateResult {
  let changed = false;
  const nodes = objectTree.map((node) => {
    if (node.id === nodeId) {
      changed = true;

      return {
        ...node,
        visible
      };
    }

    const childResult = setProjectObjectNodeVisibilityInChildren(
      node.children ?? [],
      nodeId,
      visible
    );

    if (childResult.changed) {
      changed = true;

      return {
        ...node,
        children: childResult.nodes
      };
    }

    return node;
  });

  return { changed, nodes };
}

function updateProjectObjectNodeInChildren(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  updateNode: (node: ProjectObjectNode) => ProjectObjectNode
): ProjectObjectTreeUpdateResult {
  let changed = false;
  const nodes = objectTree.map((node) => {
    if (node.id === nodeId) {
      changed = true;

      return updateNode(node);
    }

    const childResult = updateProjectObjectNodeInChildren(node.children ?? [], nodeId, updateNode);

    if (childResult.changed) {
      changed = true;

      return {
        ...node,
        children: childResult.nodes
      };
    }

    return node;
  });

  return { changed, nodes };
}

function updateProjectFileNodeObjectTreeInChildren(
  fileTree: ProjectFileNode[],
  fileNodeId: string,
  objectTree: ProjectObjectNode[]
): ProjectFileTreeUpdateResult {
  let changed = false;
  const nodes = fileTree.map((node) => {
    if (node.id === fileNodeId && isProjectObjectTreeFileNode(node)) {
      changed = true;

      return {
        ...node,
        objectTree
      };
    }

    if (node.type === "folder") {
      const childResult = updateProjectFileNodeObjectTreeInChildren(
        node.children ?? [],
        fileNodeId,
        objectTree
      );

      if (childResult.changed) {
        changed = true;

        return {
          ...node,
          children: childResult.nodes
        };
      }
    }

    return node;
  });

  return { changed, nodes };
}

type ProjectObjectTreeUpdateResult = {
  changed: boolean;
  nodes: ProjectObjectNode[];
};

type ProjectFileTreeUpdateResult = {
  changed: boolean;
  nodes: ProjectFileNode[];
};
