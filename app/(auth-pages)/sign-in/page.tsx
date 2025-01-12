import { Suspense } from 'react'
import LoginForm from './login-form'

interface Message {
  message?: string
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Message>
}) {
  const params = await searchParams
  return (
    <Suspense>
      <LoginForm message={params.message} />
    </Suspense>
  )
}
