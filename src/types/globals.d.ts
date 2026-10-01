export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: 'admin' | 'faculty' | 'student';
    }
  }
}
