import { useCallback, useState } from "react";

export type EditorCommand<TState> = {
  execute: (state: TState) => TState;
  id: string;
  label: string;
  undo: (state: TState) => TState;
};

type EditorCommandHistory<TState> = {
  redoStack: EditorCommand<TState>[];
  undoStack: EditorCommand<TState>[];
};

type UseEditorCommandHistoryOptions<TState> = {
  initialState: TState;
  onStateChange: (state: TState) => void;
};

export function useEditorCommandHistory<TState>({
  initialState,
  onStateChange
}: UseEditorCommandHistoryOptions<TState>) {
  const [state, setState] = useState<TState>(() => initialState);
  const [history, setHistory] = useState<EditorCommandHistory<TState>>({
    redoStack: [],
    undoStack: []
  });

  const executeCommand = useCallback(
    (command: EditorCommand<TState>) => {
      setState((currentState) => {
        const nextState = command.execute(currentState);

        if (Object.is(nextState, currentState)) {
          return currentState;
        }

        setHistory((currentHistory) => ({
          redoStack: [],
          undoStack: [...currentHistory.undoStack, command]
        }));
        onStateChange(nextState);

        return nextState;
      });
    },
    [onStateChange]
  );

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const command = currentHistory.redoStack.at(-1);

      if (!command) {
        return currentHistory;
      }

      setState((currentState) => {
        const nextState = command.execute(currentState);
        onStateChange(nextState);

        return nextState;
      });

      return {
        redoStack: currentHistory.redoStack.slice(0, -1),
        undoStack: [...currentHistory.undoStack, command]
      };
    });
  }, [onStateChange]);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const command = currentHistory.undoStack.at(-1);

      if (!command) {
        return currentHistory;
      }

      setState((currentState) => {
        const nextState = command.undo(currentState);
        onStateChange(nextState);

        return nextState;
      });

      return {
        redoStack: [...currentHistory.redoStack, command],
        undoStack: currentHistory.undoStack.slice(0, -1)
      };
    });
  }, [onStateChange]);

  return {
    canRedo: history.redoStack.length > 0,
    canUndo: history.undoStack.length > 0,
    executeCommand,
    redo,
    state,
    undo
  };
}
