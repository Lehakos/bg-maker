# Agent Instructions

## Cleanup After Tasks

- Remove temporary files, scratch scripts, logs, screenshots, generated debug artifacts, and other workspace leftovers created while completing a task.
- Stop any local services, dev servers, watchers, background processes, or tunnels started for verification unless the user explicitly asks to keep them running.
- Do not remove build outputs, caches, lockfiles, or generated files that are expected project artifacts unless they were created only as temporary debugging output.
- Before finishing, check for leftover running processes and unexpected untracked files when practical.
- If something must remain running or a temporary artifact must be kept, mention it clearly in the final response.

## Form State UX

- Treat type selectors inside create/edit forms as non-destructive mode switches. Preserve per-type draft state while the form is open, and restore it when the user switches back.
- Keep shared fields such as names, descriptions, tags, notes, and quantities separate from type-specific state so switching type does not unexpectedly wipe common input.
- Prefer reusable hooks, helpers, and small shared components for form-state transitions instead of duplicating branching logic in individual form sections.

## Business Logic Placement

- Do not keep business logic in UI components or controllers; keep those layers focused on rendering, input handling, request/response orchestration, and wiring.
- On the client, put business logic in reusable hooks, stores or nearby hook-level helpers.
- On the server, put business logic in services and keep controllers thin.

## Styling and CSS

- Prefer Tailwind utility classes for UI styling.
- If custom CSS is still needed, create a dedicated stylesheet next to the component that owns those styles and import it from that component.
- Keep global CSS files limited to resets, app-wide primitives, design tokens, and truly shared base behavior.

## Code Decomposition and Reuse

- Avoid very large files when a focused module, hook, helper, service, or component would make the code easier to understand and maintain.
- Before writing new code, look for existing utilities, hooks, services, components, or patterns that can be reused or extended.
- When similar logic starts to appear in more than one place, consider extracting a reusable abstraction instead of duplicating the code.
