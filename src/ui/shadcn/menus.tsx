import * as React from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export interface ChatMenuAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export function ChatContextMenu({
  actions,
  children,
  onOpenChange,
}: {
  actions: ChatMenuAction[];
  children: React.ReactElement;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="luminus-chat-beta-menu"
          collisionPadding={8}
          onCloseAutoFocus={event => event.preventDefault()}
        >
          {actions.map(action => (
            <React.Fragment key={action.id}>
              {action.separatorBefore && <ContextMenu.Separator className="cb-menu-separator" />}
              <ContextMenu.Item
                className={action.danger ? "is-danger" : undefined}
                disabled={action.disabled}
                onSelect={action.onSelect}
              >
                {action.icon}
                <span>{action.label}</span>
              </ContextMenu.Item>
            </React.Fragment>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export function ChatDropdownMenu({
  actions,
  align = "end",
  children,
}: {
  actions: ChatMenuAction[];
  align?: "start" | "center" | "end";
  children: React.ReactElement;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="luminus-chat-beta-menu"
          align={align}
          sideOffset={5}
          collisionPadding={8}
          onCloseAutoFocus={event => event.preventDefault()}
        >
          {actions.map(action => (
            <React.Fragment key={action.id}>
              {action.separatorBefore && <DropdownMenu.Separator className="cb-menu-separator" />}
              <DropdownMenu.Item
                className={action.danger ? "is-danger" : undefined}
                disabled={action.disabled}
                onSelect={action.onSelect}
              >
                {action.icon}
                <span>{action.label}</span>
              </DropdownMenu.Item>
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

