import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { DropdownMenuItem } from "./ui/dropdown-menu";

export function WorkspaceMenuEntry({
  icon: Icon,
  label,
  description,
  href,
  ...props
}: Omit<ComponentProps<typeof DropdownMenuItem>, "children"> & {
  icon: LucideIcon;
  label: string;
  description?: string;
  href?: string;
}) {
  const contents = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
        )}
      </span>
      {href && <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  return (
    <DropdownMenuItem {...props} asChild={Boolean(href)} className="min-h-11 items-start gap-3 rounded-xl px-3 py-2.5">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          {contents}
        </a>
      ) : (
        contents
      )}
    </DropdownMenuItem>
  );
}
