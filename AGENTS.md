# Agent Instructions

## Cleanup After Tasks

- Remove temporary files, scratch scripts, logs, screenshots, generated debug artifacts, and other workspace leftovers created while completing a task.
- Stop any local services, dev servers, watchers, background processes, or tunnels started for verification unless the user explicitly asks to keep them running.
- Do not remove build outputs, caches, lockfiles, or generated files that are expected project artifacts unless they were created only as temporary debugging output.
- Before finishing, check for leftover running processes and unexpected untracked files when practical.
- If something must remain running or a temporary artifact must be kept, mention it clearly in the final response.
