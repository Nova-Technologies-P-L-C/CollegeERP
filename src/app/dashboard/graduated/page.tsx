"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GraduatedDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/graduated");
  }, [router]);

  return null;
}
