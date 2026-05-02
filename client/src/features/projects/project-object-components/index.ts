import { ProjectObjectComponentEngine } from "./project-object-component-engine";

export {
  getProjectObjectAppearanceComponent,
  withProjectObjectAppearanceComponent
} from "./appearance-component";
export { getProjectObjectCardComponent, withProjectObjectCardComponent } from "./card-component";
export {
  getProjectObjectDoubleSideComponent,
  withProjectObjectDoubleSideComponent
} from "./double-side-component";
export { getProjectObjectImageComponent, withProjectObjectImageComponent } from "./image-component";
export { ProjectObjectComponentEngine } from "./project-object-component-engine";
export {
  getProjectObjectRectTransformComponent,
  withProjectObjectRectTransformComponent
} from "./rect-transform-component";
export {
  getProjectObjectLayoutComponent,
  withProjectObjectLayoutComponent
} from "./layout-component";
export { getProjectObjectShapeComponent, withProjectObjectShapeComponent } from "./shape-component";
export { getProjectObjectTextComponent, withProjectObjectTextComponent } from "./text-component";

export const projectObjectComponentEngine = new ProjectObjectComponentEngine();
