import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <form className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-[#BF5700] mb-8">Welcome to ChatGenius</h1>
        
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-black">Email</div>
            <Input 
              name="email" 
              placeholder="Your email address" 
              required 
              className="bg-black/5 text-left text-black focus:bg-black/5 placeholder:text-gray-500 [&:-webkit-autofill]:bg-black/5 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(0,0,0,0.05)] [&:-webkit-autofill]:[text-fill-color:rgb(0,0,0)]"
            />
          </div>

          <div>
            <div className="mb-1 text-black">Password</div>
            <Input
              type="password"
              name="password"
              placeholder="Your password"
              minLength={6}
              required
              className="bg-black/5 text-left text-black focus:bg-black/5 placeholder:text-gray-500"
            />
          </div>

          <SubmitButton 
            formAction={signUpAction} 
            pendingText="Signing up..."
            className="w-full bg-[#BF5700] hover:bg-[#A64A00] text-white mt-4"
          >
            Sign Up
          </SubmitButton>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-[#BF5700] hover:text-[#A64A00]">
                Sign In
              </Link>
            </p>
          </div>

          <FormMessage message={searchParams} />
        </div>
      </form>
    </div>
  );
}
