import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  // Force next.js to recognize this as a server component
  cookies();
  
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold">Hello {user.email}!</h1>
      <p className="text-muted-foreground">Welcome to your dashboard</p>
    </div>
  );
}
