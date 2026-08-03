import * as React from "react";
import { ArrowDown } from "lucide-react";
import {
  MessageScroller as MessageScrollerPrimitive,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@shadcn/react/message-scroller";

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function MessageScrollerProvider(
  props: React.ComponentProps<typeof MessageScrollerPrimitive.Provider>,
) {
  return <MessageScrollerPrimitive.Provider {...props} />;
}

export function MessageScroller({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Root>) {
  return (
    <MessageScrollerPrimitive.Root
      data-slot="message-scroller"
      className={classes("cb-ui-message-scroller", className)}
      {...props}
    />
  );
}

const AUTO_SCROLL_RESUME_DELAY_MS = 120;

export function MessageScrollerViewport({
  className,
  onScroll,
  onTouchMove,
  onWheel,
  resumeAutoScrollAtEnd = false,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Viewport> & {
  /** Restores following mode when the reader scrolls back to the newest message. */
  resumeAutoScrollAtEnd?: boolean;
}) {
  const { scrollToEnd } = useMessageScroller();
  const resumeTimerRef = React.useRef<number | null>(null);

  const cancelResume = React.useCallback(() => {
    if (resumeTimerRef.current == null) return;
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  }, []);

  React.useEffect(() => cancelResume, [cancelResume]);

  const scheduleResume = React.useCallback((viewport: HTMLDivElement) => {
    if (!resumeAutoScrollAtEnd) return;
    const atEnd = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 16;
    if (!atEnd) {
      cancelResume();
      return;
    }

    cancelResume();
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null;
      scrollToEnd({ behavior: "auto" });
    }, AUTO_SCROLL_RESUME_DELAY_MS);
  }, [cancelResume, resumeAutoScrollAtEnd, scrollToEnd]);

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(event);
    scheduleResume(event.currentTarget);
  }, [onScroll, scheduleResume]);

  const handleWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    onWheel?.(event);
    scheduleResume(event.currentTarget);
  }, [onWheel, scheduleResume]);

  const handleTouchMove = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    onTouchMove?.(event);
    scheduleResume(event.currentTarget);
  }, [onTouchMove, scheduleResume]);

  return (
    <MessageScrollerPrimitive.Viewport
      data-slot="message-scroller-viewport"
      className={classes("cb-ui-message-scroller-viewport", className)}
      onScroll={handleScroll}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      {...props}
    />
  );
}

export function MessageScrollerContent({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Content>) {
  return (
    <MessageScrollerPrimitive.Content
      data-slot="message-scroller-content"
      className={classes("cb-ui-message-scroller-content", className)}
      {...props}
    />
  );
}

export function MessageScrollerItem({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      data-slot="message-scroller-item"
      className={classes("cb-ui-message-scroller-item", className)}
      {...props}
    />
  );
}

export function MessageScrollerButton({
  className,
  children,
  direction = "end",
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Button>) {
  return (
    <MessageScrollerPrimitive.Button
      data-slot="message-scroller-button"
      className={classes("cb-ui-message-scroller-button", className)}
      direction={direction}
      title={direction === "end" ? "Ir para as mensagens mais recentes" : "Ir para o inicio"}
      {...props}
    >
      {children ?? <ArrowDown aria-hidden="true" />}
    </MessageScrollerPrimitive.Button>
  );
}

export {
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};

