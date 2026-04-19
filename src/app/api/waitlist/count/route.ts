import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_waitlist_count");

  if (error) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  return NextResponse.json({ count: Number(data) ?? 0 });
}
