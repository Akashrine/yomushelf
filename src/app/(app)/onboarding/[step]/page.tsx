import { redirect } from "next/navigation";

// The three-step top-50 picker is replaced by the common add flow.
export default function OnboardingStepPage() {
  redirect("/bibliotheque");
}
