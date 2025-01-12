import { Suspense } from 'react'
import LoginForm from './login-form'

interface PageProps {
  searchParams?: { message?: string }
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense>
      <LoginForm message={searchParams?.message} />
    </Suspense>
  )
}
