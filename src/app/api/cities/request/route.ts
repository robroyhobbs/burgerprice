import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";

    if (!city || !state) {
      return NextResponse.json(
        { error: "city and state are required" },
        { status: 400 },
      );
    }

    // Check if this city is already tracked
    const { supabase } = await import("@/lib/supabase");

    const { data: existingCity } = await supabase
      .from("cities")
      .select("id")
      .ilike("name", city)
      .ilike("state", state)
      .single();

    if (existingCity) {
      return NextResponse.json({ requestCount: 0, isTracked: true });
    }

    // Upsert into city_requests (atomic increment)
    const { data, error } = await supabase.rpc("upsert_city_request", {
      p_city: city,
      p_state: state,
    });

    // Fallback if RPC doesn't exist: manual upsert
    if (error) {
      // Try insert first
      const { error: insertError } = await supabase
        .from("city_requests")
        .insert({ city, state, request_count: 1 });

      if (insertError?.code === "23505") {
        // Unique violation — increment instead
        const { data: existing } = await supabase
          .from("city_requests")
          .select("id, request_count")
          .eq("city", city)
          .eq("state", state)
          .single();

        if (existing) {
          const newCount = existing.request_count + 1;
          await supabase
            .from("city_requests")
            .update({ request_count: newCount, updated_at: new Date().toISOString() })
            .eq("id", existing.id);

          return NextResponse.json({ requestCount: newCount, isTracked: false });
        }
      }

      if (insertError && insertError.code !== "23505") {
        return NextResponse.json(
          { error: "Failed to submit request" },
          { status: 500 },
        );
      }

      return NextResponse.json({ requestCount: 1, isTracked: false });
    }

    return NextResponse.json({
      requestCount: typeof data === "number" ? data : 1,
      isTracked: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 },
    );
  }
}
