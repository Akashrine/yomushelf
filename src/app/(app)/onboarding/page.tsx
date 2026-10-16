import { redirect } from "next/navigation";

// First steps happen in the library itself : add a manga.
export default function OnboardingPage() {
  redirect("/bibliotheque");
}
