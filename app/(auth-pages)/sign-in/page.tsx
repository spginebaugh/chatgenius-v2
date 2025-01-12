import { Suspense } from 'react'
import LoginForm from './login-form'

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <Suspense>
      <LoginForm message={searchParams.message as string | undefined} />
    </Suspense>
  )
}
