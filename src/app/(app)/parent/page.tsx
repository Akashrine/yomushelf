import { redirect } from "next/navigation";

// Amounts and settings now live in "Mon univers".
export default function ParentPage() {
  redirect("/univers");
}
