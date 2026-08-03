import * as React from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";

/** Scroll viewport element for avatar IntersectionObserver (dialog lists, etc.). */
export const AvatarScrollRootContext = React.createContext<Element | null>(null);

interface ChatScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  viewportClassName?: string;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}

export const ChatScrollArea = React.forwardRef<HTMLDivElement, ChatScrollAreaProps>(
  function ChatScrollArea(
    {
      children,
      className = "",
      contentClassName,
      viewportClassName = "",
      onScroll,
    },
    ref,
  ) {
    const [viewport, setViewport] = React.useState<HTMLDivElement | null>(null);
    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
      setViewport(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    return (
      <AvatarScrollRootContext.Provider value={viewport}>
        <ScrollArea.Root className={`cb-ui-scroll-area ${className}`}>
          <ScrollArea.Viewport
            ref={setRefs}
            className={`cb-ui-scroll-viewport ${viewportClassName}`}
            onScroll={onScroll}
          >
            {contentClassName
              ? <div className={contentClassName}>{children}</div>
              : children}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar className="cb-ui-scrollbar" orientation="vertical">
            <ScrollArea.Thumb className="cb-ui-scroll-thumb" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Corner className="cb-ui-scroll-corner" />
        </ScrollArea.Root>
      </AvatarScrollRootContext.Provider>
    );
  },
);
