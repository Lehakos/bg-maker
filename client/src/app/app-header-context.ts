import { createContext, useContext, useEffect, type ReactNode } from "react";

type AppHeaderContextValue = {
  setHeaderContent: (content: ReactNode | null) => void;
};

export const AppHeaderContext = createContext<AppHeaderContextValue | null>(null);

export function useAppHeaderContent(content: ReactNode | null) {
  const context = useContext(AppHeaderContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setHeaderContent(content);

    return () => context.setHeaderContent(null);
  }, [content, context]);
}
