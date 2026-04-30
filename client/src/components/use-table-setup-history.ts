import { useCallback, useMemo, useState } from "react";
import type { TableSetup } from "@bg-maker/shared";
import { getSetupSignature } from "./table-setup-utils";

const defaultHistoryLimit = 80;

export type TableSetupCommand = {
  execute: (setup: TableSetup) => TableSetup;
  label: string;
  mergeKey?: string;
};

type TableSetupHistoryEntry = {
  after: TableSetup;
  afterSignature: string;
  before: TableSetup;
  beforeSignature: string;
  label: string;
  mergeKey?: string;
};

type TableSetupHistoryState = {
  present: TableSetup | null;
  redoStack: TableSetupHistoryEntry[];
  undoStack: TableSetupHistoryEntry[];
};

export function useTableSetupHistory(historyLimit = defaultHistoryLimit) {
  const [state, setState] = useState<TableSetupHistoryState>({
    present: null,
    redoStack: [],
    undoStack: []
  });

  const canRedo = state.redoStack.length > 0;
  const canUndo = state.undoStack.length > 0;
  const redoLabel = state.redoStack[state.redoStack.length - 1]?.label;
  const undoLabel = state.undoStack[state.undoStack.length - 1]?.label;

  const commitSetup = useCallback((setup: TableSetup) => {
    const setupSignature = getSetupSignature(setup);

    setState((current) => {
      if (!current.present || current.present.projectId !== setup.projectId) {
        return {
          present: setup,
          redoStack: [],
          undoStack: []
        };
      }

      const presentSignature = getSetupSignature(current.present);
      const lastUndo = current.undoStack[current.undoStack.length - 1];
      const undoStack =
        lastUndo?.afterSignature === presentSignature
          ? [
              ...current.undoStack.slice(0, -1),
              {
                ...lastUndo,
                after: setup,
                afterSignature: setupSignature
              }
            ]
          : current.undoStack;

      return {
        ...current,
        present: setup,
        undoStack
      };
    });
  }, []);

  const loadSetup = useCallback((setup: TableSetup) => {
    const incomingSignature = getSetupSignature(setup);

    setState((current) => {
      if (!current.present || current.present.projectId !== setup.projectId) {
        return {
          present: setup,
          redoStack: [],
          undoStack: []
        };
      }

      if (getSetupSignature(current.present) === incomingSignature) {
        return current;
      }

      return current;
    });
  }, []);

  const executeCommand = useCallback(
    (command: TableSetupCommand) => {
      setState((current) => {
        if (!current.present) {
          return current;
        }

        const before = current.present;
        const after = command.execute(before);
        const afterSignature = getSetupSignature(after);
        const lastUndo = current.undoStack[current.undoStack.length - 1];

        if (command.mergeKey && lastUndo?.mergeKey === command.mergeKey) {
          const undoStack = current.undoStack.slice(0, -1);

          if (afterSignature === lastUndo.beforeSignature) {
            return {
              present: after,
              redoStack: [],
              undoStack
            };
          }

          return {
            present: after,
            redoStack: [],
            undoStack: [
              ...undoStack,
              {
                ...lastUndo,
                after,
                afterSignature,
                label: command.label
              }
            ]
          };
        }

        const beforeSignature = getSetupSignature(before);

        if (afterSignature === beforeSignature) {
          return current;
        }

        const nextUndoStack = [
          ...current.undoStack,
          {
            after,
            afterSignature,
            before,
            beforeSignature,
            label: command.label,
            mergeKey: command.mergeKey
          }
        ].slice(-historyLimit);

        return {
          present: after,
          redoStack: [],
          undoStack: nextUndoStack
        };
      });
    },
    [historyLimit]
  );

  const redo = useCallback(() => {
    setState((current) => {
      const command = current.redoStack[current.redoStack.length - 1];

      if (!command) {
        return current;
      }

      return {
        present: command.after,
        redoStack: current.redoStack.slice(0, -1),
        undoStack: [...current.undoStack, command].slice(-historyLimit)
      };
    });
  }, [historyLimit]);

  const undo = useCallback(() => {
    setState((current) => {
      const command = current.undoStack[current.undoStack.length - 1];

      if (!command) {
        return current;
      }

      return {
        present: command.before,
        redoStack: [...current.redoStack, command],
        undoStack: current.undoStack.slice(0, -1)
      };
    });
  }, []);

  return useMemo(
    () => ({
      canRedo,
      canUndo,
      commitSetup,
      draft: state.present,
      executeCommand,
      loadSetup,
      redo,
      redoLabel,
      undo,
      undoLabel
    }),
    [
      canRedo,
      canUndo,
      commitSetup,
      executeCommand,
      loadSetup,
      redo,
      redoLabel,
      state.present,
      undo,
      undoLabel
    ]
  );
}
