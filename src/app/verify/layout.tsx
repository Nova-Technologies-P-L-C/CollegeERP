import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Profile — Nova Technology ERP",
  description:
    "Public profile verification page for students, faculty, and administrators at Nova Technology.",
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
