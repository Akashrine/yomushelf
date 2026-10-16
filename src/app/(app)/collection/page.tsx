import { redirect } from "next/navigation";

// The reading home now lives in "Ma bibliothèque".
export default function CollectionPage() {
  redirect("/bibliotheque");
}
