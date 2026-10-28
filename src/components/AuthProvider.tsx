"use client"

import { AuthProvider as FirebaseAuthProvider } from "@/lib/firebase/AuthContext"

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
}
