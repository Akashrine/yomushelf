import { redirect } from "next/navigation";

// Amounts live in "Mon univers".
export default function ParentPage() {
  redirect("/univers");
}
