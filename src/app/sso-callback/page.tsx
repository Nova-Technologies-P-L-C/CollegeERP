"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function SSOCallbackPage() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-white dark:bg-[#0e0c18] transition-colors duration-300">
      <div className="flex flex-col items-center gap-5 z-10 p-4">
        <div className="relative h-20 w-20 overflow-hidden">
          <Image
            src="/collegelogo.png"
            alt="College Logo"
            width={146}
            height={108}
            className="h-full w-full object-contain drop-shadow-md"
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 animate-pulse">
            Securely connecting to portal...
          </p>
        </div>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
