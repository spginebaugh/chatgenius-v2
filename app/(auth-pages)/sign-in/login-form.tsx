"use client"

import * as React from "react"
import { signInAction } from "@/app/actions"
import { FormMessage } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface LoginFormProps {
  message?: string
}

export default function LoginForm({ message }: LoginFormProps) {
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
              required
              className="bg-black/5 text-left text-black focus:bg-black/5 placeholder:text-gray-500"
            />
          </div>

          <SubmitButton 
            pendingText="Signing In..." 
            formAction={signInAction}
            className="w-full bg-[#BF5700] hover:bg-[#A64A00] text-white mt-4"
          >
            Sign In
          </SubmitButton>

          <div className="text-center mt-4">
            <Link 
              href="/forgot-password" 
              className="text-sm text-gray-600 hover:text-[#BF5700]"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/sign-up" className="text-[#BF5700] hover:text-[#A64A00]">
                Sign Up
              </Link>
            </p>
          </div>

          {message && <FormMessage message={{ message }} />}
        </div>
      </form>
    </div>
  )
} 