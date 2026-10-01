import { cn } from "@/lib/utils"

interface SkeletonProps {
  variant?:
    | "text"
    | "text-sm"
    | "heading"
    | "circle"
    | "rectangle"
    | "card"
    | "avatar"
    | "button"
    | "image"
  className?: string
  lines?: number
}

export function Skeleton({ variant = "text", className, lines = 1 }: SkeletonProps) {
  const baseClasses = "animate-pulse rounded-md bg-muted"

  const variantClasses = {
    "text": "h-4 w-full",
    "text-sm": "h-3 w-full",
    "heading": "h-6 w-3/4",
    "circle": "rounded-full",
    "rectangle": "w-full",
    "card": "h-48 w-full rounded-lg",
    "avatar": "h-12 w-12 rounded-full",
    "button": "h-10 w-32 rounded-md",
    "image": "h-64 w-full rounded-lg",
  }

  if (variant === "circle" || variant === "avatar") {
    return (
      <div
        className={cn(
          baseClasses,
          variant === "circle" ? "h-4 w-4" : variantClasses[variant],
          className
        )}
      />
    )
  }

  if (lines > 1) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variantClasses[variant],
              i === lines - 1 && "w-3/4",
              className
            )}
          />
        ))}
      </div>
    )
  }

  return <div className={cn(baseClasses, variantClasses[variant], className)} />
}
