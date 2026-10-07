"use client"

import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "primary" | "secondary" | "white"
  className?: string
}

export function Spinner({ size = "md", variant = "primary", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-10 w-10",
  }

  const variantColors = {
    primary: "bg-brand-primary",
    secondary: "bg-brand-secondary",
    white: "bg-white",
  }

  const colorClass = variantColors[variant] || "bg-current"

  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0", sizeClasses[size], className)}
      role="status"
      aria-label="Loading"
    >
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={cn("absolute rounded-full", colorClass)}
          style={{
            width: "12%",
            height: "32%",
            top: "10%",
            left: "44%",
            transformOrigin: "center 125%",
            transform: `rotate(${i * 45}deg)`,
            opacity: 0.15,
            animation: "ios-spinner 0.8s linear infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes ios-spinner {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  )
}
