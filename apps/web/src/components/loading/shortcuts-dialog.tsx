import * as Dialog from "@radix-ui/react-dialog";
import { shortcuts } from "../../services/shortcuts";

export function ShortcutsDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: { preventDefault(): void }) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0b2026]/40" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100svh-2rem)] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl border bg-card p-5 shadow-xl"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <Dialog.Title className="text-lg font-semibold">Keyboard shortcuts</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            These work from the page. They stay quiet while you are typing in a field.
          </Dialog.Description>
          <ul className="mt-4 grid gap-2 text-sm">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.id} className="flex items-center justify-between gap-4">
                <span>{shortcut.label}</span>
                <kbd className="rounded-md border bg-muted px-2 py-1 font-mono text-xs">{shortcut.keys}</kbd>
              </li>
            ))}
          </ul>
          <Dialog.Close className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">
            Close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
