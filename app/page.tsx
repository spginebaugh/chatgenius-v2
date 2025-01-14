import { createClient } from "@/app/_lib/supabase-server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error("Error fetching user:", error.message);
  }

  if (!user) {
    redirect("/sign-in");
  }

  return redirect("/protected/chat");
}
