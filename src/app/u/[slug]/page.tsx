import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Public profiles are retired : libraries are private. Old links answer
// "not found" ; the readers' collections are untouched.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function RetiredPublicProfile() {
  notFound();
}
