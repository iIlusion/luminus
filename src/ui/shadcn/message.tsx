import * as React from "react";

type MessageAlignment = "start" | "end";

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-group"
      className={classes("cb-ui-message-group", className)}
      {...props}
    />
  );
}

export function Message({
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> & { align?: MessageAlignment }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={classes("cb-ui-message", className)}
      {...props}
    />
  );
}

export function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={classes("cb-ui-message-avatar", className)}
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={classes("cb-ui-message-content", className)}
      {...props}
    />
  );
}

export function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={classes("cb-ui-message-header", className)}
      {...props}
    />
  );
}
