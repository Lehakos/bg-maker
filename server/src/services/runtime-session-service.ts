import { randomUUID } from "node:crypto";
import {
  normalizeDegrees,
  type ComponentCollection,
  type CreateRuntimeSessionInput,
  type GameComponent,
  type RuntimeActionInput,
  type RuntimeActionLogEntry,
  type RuntimeInstance,
  type RuntimeLocation,
  type RuntimeSession,
  type RuntimeSessionSummary,
  type TablePlacement,
  type TableSetup,
  type TableSource,
  type TableZone,
  type ZoneSource
} from "@bg-maker/shared";
import {
  getProjectCollections,
  getProjectComponents,
  getProjectRuntimeSessions,
  projects,
  setProjectRuntimeSessions
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";
import { getTableSetup } from "./table-setup-service.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type StackIdentity =
  | {
      kind: "placement";
      placement: TablePlacement;
    }
  | {
      kind: "zone";
      zone: ZoneSource;
    };

export function listRuntimeSessions(projectId: string): ServiceResult<RuntimeSessionSummary[]> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(
    getProjectRuntimeSessions(projectId)
      .map(toRuntimeSessionSummary)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  );
}

export function createRuntimeSession(
  projectId: string,
  value: unknown
): ServiceResult<RuntimeSession> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreateRuntimeSessionInput(value);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const setupResult = getTableSetup(projectId);

  if (!setupResult.ok) {
    return setupResult;
  }

  const setupSnapshot = cloneTableSetup(setupResult.value);
  const timestamp = new Date().toISOString();
  const sessions = getProjectRuntimeSessions(projectId);
  const session: RuntimeSession = {
    id: randomUUID(),
    projectId,
    name: input.value.name ?? `Session ${sessions.length + 1}`,
    status: "active",
    setupSnapshot,
    instances: materializeRuntimeInstances(projectId, setupSnapshot),
    actionLog: [
      {
        id: randomUUID(),
        action: { type: "CREATE_SESSION" },
        createdAt: timestamp,
        message: "Created session"
      }
    ],
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectRuntimeSessions(projectId, [...sessions, session]);
  touchProject(projectId);

  return ok(session);
}

export function getRuntimeSession(
  projectId: string,
  sessionId: string
): ServiceResult<RuntimeSession> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const session = getProjectRuntimeSessions(projectId).find((item) => item.id === sessionId);

  return session ? ok(session) : fail(404, "Session not found");
}

export function applyRuntimeAction(
  projectId: string,
  sessionId: string,
  value: unknown
): ServiceResult<RuntimeSession> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const sessions = getProjectRuntimeSessions(projectId);
  const session = sessions.find((item) => item.id === sessionId);

  if (!session) {
    return fail(404, "Session not found");
  }

  const action = readRuntimeAction(value);

  if (!action.ok) {
    return fail(400, action.error);
  }

  const applied = applyAction(projectId, session, action.value);

  if (!applied.ok) {
    return fail(400, applied.error);
  }

  const updatedSession = appendActionLog(applied.value.session, action.value, applied.value.message);

  setProjectRuntimeSessions(
    projectId,
    sessions.map((item) => (item.id === sessionId ? updatedSession : item))
  );
  touchProject(projectId);

  return ok(updatedSession);
}

export function deleteRuntimeSession(
  projectId: string,
  sessionId: string
): ServiceResult<undefined> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const sessions = getProjectRuntimeSessions(projectId);
  const session = sessions.find((item) => item.id === sessionId);

  if (!session) {
    return fail(404, "Session not found");
  }

  setProjectRuntimeSessions(
    projectId,
    sessions.filter((item) => item.id !== sessionId)
  );
  touchProject(projectId);

  return ok(undefined);
}

export function runtimeSessionsUseComponent(projectId: string, componentId: string) {
  return getProjectRuntimeSessions(projectId).some(
    (session) =>
      session.instances.some((instance) => instance.componentId === componentId) ||
      session.setupSnapshot.placements.some((placement) =>
        tableSourceUsesComponent(placement.source, componentId)
      ) ||
      flattenZones(session.setupSnapshot.zones).some(
        (zone) => zone.childrenType !== "zone" && tableSourceUsesComponent(zone.source, componentId)
      )
  );
}

export function runtimeSessionsUseCollection(projectId: string, collectionId: string) {
  return getProjectRuntimeSessions(projectId).some(
    (session) =>
      session.setupSnapshot.placements.some((placement) =>
        tableSourceUsesCollection(placement.source, collectionId)
      ) ||
      flattenZones(session.setupSnapshot.zones).some(
        (zone) =>
          zone.childrenType !== "zone" && tableSourceUsesCollection(zone.source, collectionId)
      )
  );
}

function parseCreateRuntimeSessionInput(value: unknown): ParseResult<CreateRuntimeSessionInput> {
  if (value === undefined || value === null) {
    return { ok: true, value: {} };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  if (value.name === undefined) {
    return { ok: true, value: {} };
  }

  const name = readRequiredString(value.name, "Session name");

  return name.ok ? { ok: true, value: { name: name.value } } : name;
}

function materializeRuntimeInstances(projectId: string, setup: TableSetup): RuntimeInstance[] {
  const componentsById = new Map(
    getProjectComponents(projectId).map((component) => [component.id, component])
  );
  const collectionsById = new Map(
    getProjectCollections(projectId).map((collection) => [collection.id, collection])
  );
  const instances: RuntimeInstance[] = [];

  for (const zone of flattenZones(setup.zones)) {
    if (zone.childrenType === "zone" || !zone.autofill) {
      continue;
    }

    const components = materializeSourceComponents(zone.source, componentsById, collectionsById);
    const cappedComponents = components.slice(0, zone.capacity ?? components.length);

    cappedComponents.forEach((component, index) => {
      instances.push(
        createRuntimeInstance(component, {
          faceUp: zone.face === "up",
          location: { kind: "zone", zoneId: zone.id, index },
          origin: { kind: "zone", zoneId: zone.id },
          rotationDeg: 0
        })
      );
    });
  }

  for (const placement of setup.placements) {
    const components = materializeSourceComponents(
      placement.source,
      componentsById,
      collectionsById
    );

    components.forEach((component, index) => {
      instances.push(
        createRuntimeInstance(component, {
          faceUp: placement.face === "front",
          location: { kind: "placement", placementId: placement.id, index },
          origin: { kind: "placement", placementId: placement.id },
          rotationDeg: placement.rotationDeg
        })
      );
    });
  }

  return normalizeLocationIndexes(instances);
}

function materializeSourceComponents(
  source: TableSource | undefined,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (!source) {
    return [];
  }

  if (source.kind === "component") {
    const component = componentsById.get(source.componentId);
    return component ? [component] : [];
  }

  const collection = collectionsById.get(source.collectionId);
  const components: GameComponent[] = [];

  for (const item of collection?.items ?? []) {
    const component = componentsById.get(item.componentId);

    if (!component) {
      continue;
    }

    for (let index = 0; index < item.quantity; index += 1) {
      components.push(component);
    }
  }

  return components;
}

function createRuntimeInstance(
  component: GameComponent,
  input: Pick<RuntimeInstance, "faceUp" | "location" | "origin" | "rotationDeg">
): RuntimeInstance {
  return {
    id: randomUUID(),
    componentId: component.id,
    componentType: component.type,
    faceUp: input.faceUp,
    location: input.location,
    origin: input.origin,
    rotationDeg: normalizeDegrees(input.rotationDeg),
    tapped: false
  };
}

function applyAction(
  projectId: string,
  session: RuntimeSession,
  action: RuntimeActionInput
): ParseResult<{ message: string; session: RuntimeSession }> {
  switch (action.type) {
    case "MOVE_INSTANCE":
      return moveRuntimeInstance(projectId, session, action.instanceId, action.target);
    case "SHUFFLE_STACK":
      return shuffleRuntimeStack(projectId, session, action.location);
    case "FLIP_INSTANCE":
      return updateRuntimeInstance(
        session,
        action.instanceId,
        (instance) => ({
          ...instance,
          faceUp: action.faceUp ?? !instance.faceUp
        }),
        "Flipped instance"
      );
    case "ROTATE_INSTANCE":
      return updateRuntimeInstance(
        session,
        action.instanceId,
        (instance) => ({
          ...instance,
          rotationDeg: normalizeDegrees(
            action.rotationDeg ?? instance.rotationDeg + (action.deltaDeg ?? 0)
          ),
          tapped: action.tapped ?? instance.tapped
        }),
        action.tapped === undefined ? "Rotated instance" : "Updated tap state"
      );
    case "ROLL_DIE":
      return rollRuntimeDie(projectId, session, action.instanceId);
    case "RESET_SESSION":
      return {
        ok: true,
        value: {
          session: {
            ...session,
            instances: materializeRuntimeInstances(projectId, session.setupSnapshot)
          },
          message: "Reset session"
        }
      };
  }
}

function moveRuntimeInstance(
  projectId: string,
  session: RuntimeSession,
  instanceId: string,
  target: RuntimeLocation
): ParseResult<{ message: string; session: RuntimeSession }> {
  if (target.kind !== "zone") {
    return { ok: false, error: "Runtime move target must be a zone" };
  }

  const instance = session.instances.find((item) => item.id === instanceId);

  if (!instance) {
    return { ok: false, error: "Runtime instance not found" };
  }

  const zone = findZone(session.setupSnapshot.zones, target.zoneId);

  if (!zone) {
    return { ok: false, error: "Runtime target zone not found" };
  }

  if (zone.childrenType === "zone") {
    return { ok: false, error: "Runtime target must be a source zone" };
  }

  const compatibility = validateZoneAcceptsInstance(projectId, zone, instance, session);

  if (!compatibility.ok) {
    return compatibility;
  }

  const instances = moveInstanceToLocation(session.instances, instance, target);

  return {
    ok: true,
    value: {
      session: {
        ...session,
        instances
      },
      message: `Moved ${getComponentName(projectId, instance.componentId)} to ${zone.name}`
    }
  };
}

function validateZoneAcceptsInstance(
  projectId: string,
  zone: ZoneSource,
  instance: RuntimeInstance,
  session: RuntimeSession
): ParseResult<undefined> {
  if (instance.componentType !== zone.childrenType) {
    return { ok: false, error: "Runtime target zone type does not match instance type" };
  }

  const existingTargetCount = session.instances.filter(
    (item) =>
      item.id !== instance.id &&
      item.location.kind === "zone" &&
      item.location.zoneId === zone.id
  ).length;

  if (zone.capacity !== null && existingTargetCount >= zone.capacity) {
    return { ok: false, error: "Runtime target zone is full" };
  }

  if (!zone.source) {
    return { ok: true, value: undefined };
  }

  if (zone.source.kind === "component") {
    return zone.source.componentId === instance.componentId
      ? { ok: true, value: undefined }
      : { ok: false, error: "Runtime target zone source does not include this component" };
  }

  const collectionSource = zone.source;
  const sourceCollection = getProjectCollections(projectId).find(
    (item) => item.id === collectionSource.collectionId
  );

  if (!sourceCollection) {
    return { ok: false, error: "Runtime target zone source collection is missing" };
  }

  return sourceCollection?.items.some((item) => item.componentId === instance.componentId)
    ? { ok: true, value: undefined }
    : { ok: false, error: "Runtime target zone source does not include this component" };
}

function shuffleRuntimeStack(
  projectId: string,
  session: RuntimeSession,
  location: RuntimeLocation
): ParseResult<{ message: string; session: RuntimeSession }> {
  const identity = getStackIdentity(session.setupSnapshot, location);

  if (!identity) {
    return { ok: false, error: "Runtime stack not found" };
  }

  if (!stackIsDeck(projectId, identity)) {
    return { ok: false, error: "Only deck stacks can be shuffled" };
  }

  const stack = getStackInstances(session.instances, location);

  if (stack.length < 2) {
    return { ok: false, error: "Runtime stack needs at least two items to shuffle" };
  }

  const shuffled = shuffleInstances(stack);
  const shuffledIds = new Set(shuffled.map((instance) => instance.id));
  const nextStack = shuffled.map((instance, index) => ({
    ...instance,
    location: { ...instance.location, index }
  }));
  const instances = normalizeLocationIndexes([
    ...session.instances.filter((instance) => !shuffledIds.has(instance.id)),
    ...nextStack
  ]);

  return {
    ok: true,
    value: {
      session: {
        ...session,
        instances
      },
      message: `Shuffled ${getStackName(identity)}`
    }
  };
}

function rollRuntimeDie(
  projectId: string,
  session: RuntimeSession,
  instanceId: string
): ParseResult<{ message: string; session: RuntimeSession }> {
  const instance = session.instances.find((item) => item.id === instanceId);

  if (!instance) {
    return { ok: false, error: "Runtime instance not found" };
  }

  const component = getProjectComponents(projectId).find((item) => item.id === instance.componentId);

  if (!component || component.type !== "die") {
    return { ok: false, error: "Runtime instance is not a die" };
  }

  const value = Math.floor(Math.random() * component.sides) + 1;
  const label = component.faceLabels[value - 1]?.trim() || undefined;
  const result = label ?? String(value);
  const rolledAt = new Date().toISOString();

  return updateRuntimeInstance(
    session,
    instanceId,
    (item) => ({
      ...item,
      lastRoll: label ? { label, rolledAt, value } : { rolledAt, value }
    }),
    `Rolled ${component.name}: result ${result}, face ${value} of ${component.sides}`
  );
}

function updateRuntimeInstance(
  session: RuntimeSession,
  instanceId: string,
  updater: (instance: RuntimeInstance) => RuntimeInstance,
  message: string
): ParseResult<{ message: string; session: RuntimeSession }> {
  const instance = session.instances.find((item) => item.id === instanceId);

  if (!instance) {
    return { ok: false, error: "Runtime instance not found" };
  }

  return {
    ok: true,
    value: {
      session: {
        ...session,
        instances: session.instances.map((item) => (item.id === instanceId ? updater(item) : item))
      },
      message
    }
  };
}

function readRuntimeAction(value: unknown): ParseResult<RuntimeActionInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Runtime action must be an object" };
  }

  if (value.type === "RESET_SESSION") {
    return { ok: true, value: { type: "RESET_SESSION" } };
  }

  if (value.type === "MOVE_INSTANCE") {
    const instanceId = readRequiredString(value.instanceId, "Runtime instance id");
    const target = readRuntimeLocation(value.target);

    if (!instanceId.ok) {
      return instanceId;
    }

    if (!target.ok) {
      return target;
    }

    return {
      ok: true,
      value: {
        type: "MOVE_INSTANCE",
        instanceId: instanceId.value,
        target: target.value
      }
    };
  }

  if (value.type === "SHUFFLE_STACK") {
    const location = readRuntimeLocation(value.location);

    return location.ok
      ? { ok: true, value: { type: "SHUFFLE_STACK", location: location.value } }
      : location;
  }

  if (value.type === "FLIP_INSTANCE") {
    const instanceId = readRequiredString(value.instanceId, "Runtime instance id");

    if (!instanceId.ok) {
      return instanceId;
    }

    return {
      ok: true,
      value: {
        type: "FLIP_INSTANCE",
        instanceId: instanceId.value,
        ...(typeof value.faceUp === "boolean" ? { faceUp: value.faceUp } : {})
      }
    };
  }

  if (value.type === "ROTATE_INSTANCE") {
    const instanceId = readRequiredString(value.instanceId, "Runtime instance id");
    const rotationDeg = readOptionalNumber(value.rotationDeg, "Runtime rotation");
    const deltaDeg = readOptionalNumber(value.deltaDeg, "Runtime rotation delta");

    if (!instanceId.ok) {
      return instanceId;
    }

    if (!rotationDeg.ok) {
      return rotationDeg;
    }

    if (!deltaDeg.ok) {
      return deltaDeg;
    }

    if (value.tapped !== undefined && typeof value.tapped !== "boolean") {
      return { ok: false, error: "Runtime tapped state must be a boolean" };
    }

    return {
      ok: true,
      value: {
        type: "ROTATE_INSTANCE",
        instanceId: instanceId.value,
        ...(rotationDeg.value !== undefined ? { rotationDeg: rotationDeg.value } : {}),
        ...(deltaDeg.value !== undefined ? { deltaDeg: deltaDeg.value } : {}),
        ...(typeof value.tapped === "boolean" ? { tapped: value.tapped } : {})
      }
    };
  }

  if (value.type === "ROLL_DIE") {
    const instanceId = readRequiredString(value.instanceId, "Runtime instance id");

    return instanceId.ok
      ? { ok: true, value: { type: "ROLL_DIE", instanceId: instanceId.value } }
      : instanceId;
  }

  return { ok: false, error: "Runtime action type is invalid" };
}

function readRuntimeLocation(value: unknown): ParseResult<RuntimeLocation> {
  if (!isRecord(value)) {
    return { ok: false, error: "Runtime location must be an object" };
  }

  const index = readRequiredInteger(value.index, "Runtime location index", { min: 0, max: 10000 });

  if (!index.ok) {
    return index;
  }

  if (value.kind === "zone") {
    const zoneId = readRequiredString(value.zoneId, "Runtime location zone id");

    return zoneId.ok
      ? { ok: true, value: { kind: "zone", zoneId: zoneId.value, index: index.value } }
      : zoneId;
  }

  if (value.kind === "placement") {
    const placementId = readRequiredString(value.placementId, "Runtime location placement id");

    return placementId.ok
      ? {
          ok: true,
          value: { kind: "placement", placementId: placementId.value, index: index.value }
        }
      : placementId;
  }

  return { ok: false, error: "Runtime location kind is invalid" };
}

function moveInstanceToLocation(
  instances: RuntimeInstance[],
  instance: RuntimeInstance,
  target: RuntimeLocation
) {
  const withoutInstance = instances.filter((item) => item.id !== instance.id);
  const targetStack = getStackInstances(withoutInstance, target);
  const targetStackIds = new Set(targetStack.map((item) => item.id));
  const clampedIndex = Math.min(Math.max(0, target.index), targetStack.length);
  const movedInstance = {
    ...instance,
    location:
      target.kind === "zone"
        ? { kind: "zone" as const, zoneId: target.zoneId, index: clampedIndex }
        : { kind: "placement" as const, placementId: target.placementId, index: clampedIndex }
  };
  const nextTargetStack = [...targetStack];
  nextTargetStack.splice(clampedIndex, 0, movedInstance);

  return normalizeLocationIndexes([
    ...withoutInstance.filter((item) => !targetStackIds.has(item.id)),
    ...nextTargetStack
  ]);
}

function normalizeLocationIndexes(instances: RuntimeInstance[]) {
  const grouped = new Map<string, { instance: RuntimeInstance; order: number }[]>();

  instances.forEach((instance, order) => {
    const key = getLocationKey(instance.location);
    grouped.set(key, [...(grouped.get(key) ?? []), { instance, order }]);
  });

  return Array.from(grouped.values()).flatMap((entries) =>
    entries
      .sort(
        (left, right) =>
          left.instance.location.index - right.instance.location.index || left.order - right.order
      )
      .map(({ instance }, index) => ({
        ...instance,
        location: { ...instance.location, index }
      }))
  );
}

function getStackInstances(instances: RuntimeInstance[], location: RuntimeLocation) {
  return instances
    .filter((instance) => locationsMatch(instance.location, location))
    .sort((left, right) => left.location.index - right.location.index);
}

function shuffleInstances(instances: RuntimeInstance[]) {
  const shuffled = [...instances];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.every((instance, index) => instance.id === instances[index]?.id)) {
    return [...shuffled].reverse();
  }

  return shuffled;
}

function appendActionLog(
  session: RuntimeSession,
  action: RuntimeActionInput,
  message: string
): RuntimeSession {
  const timestamp = new Date().toISOString();
  const entry: RuntimeActionLogEntry = {
    id: randomUUID(),
    action,
    createdAt: timestamp,
    message
  };

  return {
    ...session,
    actionLog: [...session.actionLog, entry],
    updatedAt: timestamp
  };
}

function validateDeckSource(projectId: string, source: TableSource | undefined) {
  if (source?.kind !== "collection") {
    return false;
  }

  return getProjectCollections(projectId).some(
    (collection) => collection.id === source.collectionId && collection.type === "deck"
  );
}

function stackIsDeck(projectId: string, identity: StackIdentity) {
  return validateDeckSource(
    projectId,
    identity.kind === "zone" ? identity.zone.source : identity.placement.source
  );
}

function getStackIdentity(setup: TableSetup, location: RuntimeLocation): StackIdentity | null {
  if (location.kind === "placement") {
    const placement = setup.placements.find((item) => item.id === location.placementId);
    return placement ? { kind: "placement", placement } : null;
  }

  const zone = findZone(setup.zones, location.zoneId);

  return zone && zone.childrenType !== "zone" ? { kind: "zone", zone } : null;
}

function getStackName(identity: StackIdentity) {
  return identity.kind === "zone" ? identity.zone.name : "loose deck";
}

function getComponentName(projectId: string, componentId: string) {
  return (
    getProjectComponents(projectId).find((component) => component.id === componentId)?.name ??
    "item"
  );
}

function findZone(zones: TableZone[], zoneId: string): TableZone | null {
  for (const zone of zones) {
    if (zone.id === zoneId) {
      return zone;
    }

    if (zone.childrenType === "zone") {
      const child = findZone(zone.children, zoneId);

      if (child) {
        return child;
      }
    }
  }

  return null;
}

function flattenZones(zones: TableZone[]): TableZone[] {
  return zones.flatMap((zone): TableZone[] =>
    zone.childrenType === "zone" ? [zone, ...flattenZones(zone.children)] : [zone]
  );
}

function locationsMatch(left: RuntimeLocation, right: RuntimeLocation) {
  return getLocationKey(left) === getLocationKey(right);
}

function getLocationKey(location: RuntimeLocation) {
  return location.kind === "zone" ? `zone:${location.zoneId}` : `placement:${location.placementId}`;
}

function tableSourceUsesComponent(source: TableSource | undefined, componentId: string) {
  return source?.kind === "component" && source.componentId === componentId;
}

function tableSourceUsesCollection(source: TableSource | undefined, collectionId: string) {
  return source?.kind === "collection" && source.collectionId === collectionId;
}

function cloneTableSetup(setup: TableSetup): TableSetup {
  return JSON.parse(JSON.stringify(setup)) as TableSetup;
}

function toRuntimeSessionSummary(session: RuntimeSession): RuntimeSessionSummary {
  return {
    id: session.id,
    projectId: session.projectId,
    name: session.name,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    instanceCount: session.instances.length,
    actionCount: session.actionLog.length
  };
}

function readRequiredString(value: unknown, label: string): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false, error: `${label} must not be empty` };
  }

  return { ok: true, value: trimmed };
}

function readOptionalNumber(value: unknown, label: string): ParseResult<number | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  return readRequiredNumber(value, label);
}

function readRequiredNumber(value: unknown, label: string): ParseResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a number` };
  }

  return { ok: true, value };
}

function readRequiredInteger(
  value: unknown,
  label: string,
  range: { max?: number; min?: number } = {}
): ParseResult<number> {
  const number = readRequiredNumber(value, label);

  if (!number.ok) {
    return number;
  }

  if (!Number.isInteger(number.value)) {
    return { ok: false, error: `${label} must be an integer` };
  }

  if (range.min !== undefined && number.value < range.min) {
    return { ok: false, error: `${label} must be at least ${range.min}` };
  }

  if (range.max !== undefined && number.value > range.max) {
    return { ok: false, error: `${label} must be at most ${range.max}` };
  }

  return number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
