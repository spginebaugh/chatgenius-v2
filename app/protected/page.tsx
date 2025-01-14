import { createClient } from "@/app/_lib/supabase-server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/sign-in");
  }

  return (
    <div className="w-full flex flex-col items-center">
      <span className="text-4xl">Protected content for {user.email}</span>
    </div>
  );
}
