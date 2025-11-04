import { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID!,
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow users from rsautomation.net domain
      if (account?.provider === 'azure-ad') {
        const email = user.email as string
        if (!email.endsWith('@rsautomation.net')) {
          return false
        }
        return true
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (account && user) {
        // Check database for user role
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email as string }
          })
          
          if (dbUser) {
            token.role = dbUser.role
          } else {
            // Create new user with default role
            const newUser = await prisma.user.create({
              data: {
                email: user.email as string,
                name: user.name as string,
                role: 'USER'
              }
            })
            token.role = newUser.role
          }
        } catch (error) {
          console.error('Error checking user role:', error)
          token.role = 'USER' // Fallback to default role
        }
        
        token.id = user.id || user.email
        token.email = user.email
        token.name = user.name
      }
      
      // On subsequent requests, only refresh role from database if explicitly triggered
      // Don't refresh on every request to avoid unnecessary reloads
      if (token.email && !account && trigger === 'update') {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { role: true }
          })
          if (dbUser) {
            const oldRole = token.role
            token.role = dbUser.role
            // Log if role changed
            if (oldRole !== dbUser.role) {
              console.log(`Role updated for ${token.email}: ${oldRole} → ${dbUser.role}`)
            }
          }
        } catch (error) {
          console.error('Error refreshing user role:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    }
  }
}


