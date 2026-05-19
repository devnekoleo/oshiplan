import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PlanWizard } from "@/components/plans/PlanWizard";
import type { Artist } from "@/types";

export const metadata = { title: "遠征プランを作る" };

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  const { venue } = await searchParams;
  const user = await getCurrentUser();

  let artists: Artist[] = [];
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("artists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    artists = (data ?? []) as Artist[];
  }

  const homeStation = user
    ? await (async () => {
        const supabase = await createClient();
        const { data } = await supabase
          .from("users")
          .select("home_station")
          .eq("id", user.id)
          .single();
        return data?.home_station ?? "";
      })()
    : "";

  return (
    <PlanWizard
      artists={artists}
      homeStation={homeStation}
      isLoggedIn={!!user}
      initialVenue={venue ?? ""}
    />
  );
}
