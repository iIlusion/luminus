import * as React from "react";

type BubbleAlignment = "start" | "end";
type BubbleVariant = "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Bubble({
  align = "start",
  variant = "default",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: BubbleAlignment;
  variant?: BubbleVariant;
}) {
  return (
    <div
      data-slot="bubble"
      data-align={align}
      data-variant={variant}
      className={classes("cb-ui-bubble", className)}
      {...props}
    />
  );
}

export function BubbleContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-content"
      className={classes("cb-ui-bubble-content", className)}
      {...props}
    />
  );
}
