import { auth } from '@clerk/nextjs/server'

export const checkRole = async (role: 'admin' | 'faculty' | 'student') => {
  const { sessionClaims } = await auth()
  return sessionClaims?.metadata?.role === role
}
