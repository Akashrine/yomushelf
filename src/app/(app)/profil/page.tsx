import { redirect } from "next/navigation";

// Settings now live in "Mon univers".
export default function ProfilPage() {
  redirect("/univers#reglages");
}
