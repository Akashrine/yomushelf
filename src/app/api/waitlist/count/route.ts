import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Public and the same for everyone : no cookies read, so the route stays
// static and Vercel serves it from cache, refreshed every 60 s.
export const revalidate = 60;

export async function GET() {
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("get_waitlist_count");

  if (error) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  return NextResponse.json({ count: Number(data) ?? 0 });
}
