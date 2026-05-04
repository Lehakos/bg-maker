export const stickyModalStyles = {
  body: {
    display: "flex",
    flex: "1 1 auto",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    padding: 0
  },
  content: {
    display: "flex",
    flexDirection: "column",
    maxHeight: "calc(100dvh - 32px)",
    overflow: "hidden"
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid rgb(226 232 240)"
  }
} as const;

export const stickyModalFormClassName = "flex min-h-0 flex-1 flex-col";
export const stickyModalBodyClassName = "min-h-0 flex-1 overflow-y-auto px-6 py-4";
export const stickyModalFooterClassName =
  "shrink-0 border-t border-slate-200 bg-white px-6 py-4";
