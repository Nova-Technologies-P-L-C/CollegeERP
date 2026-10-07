import Link from "next/link";
import { UserX } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile Not Found — Nova Technology ERP",
};

export default function VerifyNotFound() {
  return (
    <main className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-brand-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border border-brand-light">
        <div className="w-16 h-16 rounded-full bg-system-danger/10 mx-auto flex items-center justify-center mb-4">
          <UserX className="w-8 h-8 text-system-danger" />
        </div>
        <h1 className="text-xl font-bold text-brand-dark mb-2">
          Profile Not Found
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          The QR code you scanned does not match any registered user in the
          Nova Technology ERP Portal. Please contact the institution if you
          believe this is an error.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2.5 bg-brand-primary text-brand-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go to Homepage
        </Link>
      </div>
    </main>
  );
}
