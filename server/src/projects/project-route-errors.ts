import { ProjectValidationError } from "./project-validation-error.js";

export function getProjectValidationErrorStatusCode(error: ProjectValidationError) {
  if (error.message === "Unsupported image content type") {
    return 415;
  }

  if (error.message === "Image asset is too large") {
    return 413;
  }

  return 400;
}
