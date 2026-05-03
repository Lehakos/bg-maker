import { ProjectObjectComponentEngine } from "./project-object-component-engine";

export {
  getProjectObjectAppearanceComponent,
  withProjectObjectAppearanceComponent
} from "./appearance-component";
export { getProjectObjectCardComponent, withProjectObjectCardComponent } from "./card-component";
export {
  getProjectObjectContainerComponent,
  withProjectObjectContainerComponent
} from "./container-component";
export { getProjectObjectDeckComponent, withProjectObjectDeckComponent } from "./deck-component";
export { getProjectObjectDieComponent, withProjectObjectDieComponent } from "./die-component";
export {
  getProjectObjectDoubleSideComponent,
  withProjectObjectDoubleSideComponent
} from "./double-side-component";
export {
  getProjectObjectCounterComponent,
  withProjectObjectCounterComponent
} from "./counter-component";
export { getProjectObjectImageComponent, withProjectObjectImageComponent } from "./image-component";
export { ProjectObjectComponentEngine } from "./project-object-component-engine";
export {
  getProjectObjectRectTransformComponent,
  withProjectObjectRectTransformComponent
} from "./rect-transform-component";
export {
  getProjectObjectStackDisplayComponent,
  withProjectObjectStackDisplayComponent
} from "./stack-display-component";
export {
  getProjectObjectLayoutComponent,
  withProjectObjectLayoutComponent
} from "./layout-component";
export { getProjectObjectShapeComponent, withProjectObjectShapeComponent } from "./shape-component";
export { getProjectObjectTextComponent, withProjectObjectTextComponent } from "./text-component";
export { getProjectObjectZoneComponent, withProjectObjectZoneComponent } from "./zone-component";

export const projectObjectComponentEngine = new ProjectObjectComponentEngine();
