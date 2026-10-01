"use client"

import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface FullPageLoaderProps {
  loading?: boolean
  label?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "secondary"
  className?: string
  overlay?: boolean
}

const logoSizes = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
  xl: "h-36 w-36",
}

export function FullPageLoader({
  loading = true,
  label = "Loading...",
  size = "lg",
  className,
  overlay = false,
}: FullPageLoaderProps) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "flex items-center justify-center",
            overlay
              ? "fixed inset-0 z-50 bg-brand-dark/50 backdrop-blur-sm"
              : "min-h-screen w-full",
            className
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="flex flex-col items-center gap-5 p-4"
          >
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.98, 1.04, 0.98] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={cn("relative shrink-0 overflow-hidden", logoSizes[size])}
              >
                <Image
                  src="/collegelogo.png"
                  alt="Nova Technology logo"
                  width={146}
                  height={108}
                  className="h-full w-full object-contain drop-shadow-md"
                  priority
                />
              </motion.div>
            </div>

            {label && (
              <motion.p
                className="text-sm font-extrabold tracking-wider text-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                {label}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
