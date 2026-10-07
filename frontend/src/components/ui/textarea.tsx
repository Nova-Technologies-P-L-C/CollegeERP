import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-none border-2 border-border bg-background px-3 py-2 text-base shadow-[2px_2px_0px_0px_var(--border)] transition-[color,box-shadow,transform] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30",
        "focus-visible:border-primary focus-visible:shadow-[3px_3px_0px_0px_var(--border)] focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
