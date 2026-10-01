"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { TopiLoader } from "./topi-loader"

interface LoaderProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "secondary" | "dots" | "bars"
  label?: string
  className?: string
}

export function Loader({ size = "md", variant = "primary", label, className }: LoaderProps) {
  if (variant === "dots") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn(
                "rounded-full bg-brand-primary",
                size === "sm" && "w-2 h-2",
                size === "md" && "w-3 h-3",
                size === "lg" && "w-4 h-4",
                size === "xl" && "w-5 h-5"
              )}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        {label && (
          <motion.p
            className="text-sm text-muted-foreground"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {label}
          </motion.p>
        )}
      </div>
    )
  }

  if (variant === "bars") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className={cn(
                "w-1 bg-brand-primary rounded-full",
                size === "sm" && "h-4",
                size === "md" && "h-6",
                size === "lg" && "h-8",
                size === "xl" && "h-10"
              )}
              animate={{
                scaleY: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
        {label && (
          <p className="text-sm text-muted-foreground">{label}</p>
        )}
      </div>
    )
  }

  // Primary and Secondary variants use spinner
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <TopiLoader size={size} variant={variant} />
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
    </div>
  )
}
