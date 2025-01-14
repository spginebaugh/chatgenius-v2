import { signOutAction } from "@/app/actions";
import { checkEnvVars } from "@/lib/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/app/_lib/supabase-server";
import { User } from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleIcon } from "lucide-react";

export default async function AuthButton() {
  try {
    checkEnvVars();
  } catch (error) {
    return (
      <>
        <div className="flex gap-4 items-center">
          <div>
            <Badge
              variant={"default"}
              className="font-normal pointer-events-none"
            >
              Please update .env.local file with anon key and url
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant={"outline"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={"default"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Error fetching user:', authError.message);
    return null;
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("username, status")
    .eq("id", authUser?.id)
    .single();

  if (userError && authUser) {
    console.error('Error fetching user data:', userError.message);
    return null;
  }

  return authUser ? (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <CircleIcon
              size={8}
              className={userData?.status === "ONLINE" ? "text-green-500" : "text-gray-500"}
              fill="currentColor"
            />
            {userData?.username || authUser.email}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">Change Username</Link>
          </DropdownMenuItem>
          <form action={signOutAction}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full text-left">
                Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
