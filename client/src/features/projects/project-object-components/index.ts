import { ProjectObjectComponentEngine } from "./project-object-component-engine";

export {
  getProjectObjectAppearanceComponent,
  withProjectObjectAppearanceComponent
} from "./appearance-component";
export { getProjectObjectImageComponent, withProjectObjectImageComponent } from "./image-component";
export { ProjectObjectComponentEngine } from "./project-object-component-engine";
export {
  getProjectObjectRectTransformComponent,
  withProjectObjectRectTransformComponent
} from "./rect-transform-component";
export { getProjectObjectShapeComponent, withProjectObjectShapeComponent } from "./shape-component";
export { getProjectObjectTextComponent, withProjectObjectTextComponent } from "./text-component";

export const projectObjectComponentEngine = new ProjectObjectComponentEngine();
