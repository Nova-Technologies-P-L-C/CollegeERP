"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TopiLoaderProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "secondary" | "white"
  className?: string
}

const TOPI_PATHS = [
  "M100 0H4.16668C1.86549 0 0 2.05845 0 4.59768V11.4942C0 14.0334 1.86549 16.0919 4.16668 16.0919H100C102.301 16.0919 104.167 14.0334 104.167 11.4942V4.59768C104.167 2.05845 102.301 0 100 0Z",
  "M20.8334 16.0914H83.3336L89.5836 62.0682H14.5834L20.8334 16.0914Z",
  "M100 59.7698H4.16647C3.01588 59.7698 2.08313 60.799 2.08313 62.0686V64.3675C2.08313 65.6371 3.01588 66.6663 4.16647 66.6663H100C101.151 66.6663 102.083 65.6371 102.083 64.3675V62.0686C102.083 60.799 101.151 59.7698 100 59.7698Z",
  "M104.167 6.89673C118.056 17.6247 122.917 32.184 118.75 50.5747",
  "M112.5 48.2756L108.334 64.3675",
  "M118.75 50.5748L116.667 66.6667",
  "M125 45.9767L122.917 62.0686",
  "M118.75 54.0227C121.627 54.0227 123.959 51.4496 123.959 48.2756C123.959 45.1015 121.627 42.5285 118.75 42.5285C115.874 42.5285 113.542 45.1015 113.542 48.2756C113.542 51.4496 115.874 54.0227 118.75 54.0227Z",
] as const

const TOPI_STROKES = [false, false, false, true, true, true, true, false] as const

const PALETTES: Record<NonNullable<TopiLoaderProps["variant"]>, string[]> = {
  primary: ["#E6F1FB", "#B5D4F4", "#85B7EB", "#E6F1FB", "#B5D4F4", "#B5D4F4", "#B5D4F4", "#85B7EB"],
  secondary: ["#DBF4F7", "#AFE8EF", "#74D5E0", "#DFF7FA", "#9DE1E9", "#9DE1E9", "#9DE1E9", "#74D5E0"],
  white: ["#FFFFFF", "#FFFFFFCC", "#FFFFFFB3", "#FFFFFFCC", "#FFFFFF99", "#FFFFFF99", "#FFFFFF99", "#FFFFFFE6"],
}

export function TopiLoader({ size = "md", variant = "primary", className }: TopiLoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-11",
    md: "h-8 w-16",
    lg: "h-10 w-20",
    xl: "h-12 w-24",
  }

  const colors = PALETTES[variant]

  return (
    <motion.div
      className={cn("relative", sizeClasses[size], className)}
      animate={{ y: [0, -1.5, 0, 1.2, 0], scale: [0.985, 1, 0.99, 1] }}
      transition={{ duration: 2.1, ease: "easeInOut", repeat: Infinity }}
      aria-hidden="true"
    >
      <motion.svg
        viewBox="0 0 126 67"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-[0_6px_18px_rgba(61,94,225,0.2)]"
      >
        {TOPI_PATHS.map((d, index) => {
          const isStroke = TOPI_STROKES[index]

          return (
            <motion.path
              key={d}
              d={d}
              stroke={isStroke ? colors[index] : undefined}
              strokeWidth={isStroke ? 1.2 : undefined}
              fill={isStroke ? "none" : colors[index]}
              initial={{ opacity: 0.2, y: 2 }}
              animate={{ opacity: [0.25, 1, 0.6, 1], y: [2, 0, 0.8, 0] }}
              transition={{
                duration: 1.7,
                ease: "easeInOut",
                repeat: Infinity,
                delay: index * 0.08,
              }}
            />
          )
        })}
      </motion.svg>
    </motion.div>
  )
}
