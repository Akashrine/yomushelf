import { redirect } from "next/navigation";

// Settings live behind the gear (/reglages).
export default function ProfilPage() {
  redirect("/reglages");
}
