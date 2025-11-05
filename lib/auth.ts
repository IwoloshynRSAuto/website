import { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Determine if we're using HTTPS (domain) or HTTP (IP address)
const nextAuthUrl = process.env.NEXTAUTH_URL || ''
const isHttps = nextAuthUrl.startsWith('https://')
const isIpAddress = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/.test(nextAuthUrl)
const useSecureCookies = isHttps && !isIpAddress // Use secure cookies only for HTTPS domains

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
  useSecureCookies, // Conditional: true for HTTPS domains, false for IP addresses
  cookies: {
    sessionToken: {
      name: useSecureCookies ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies, // Only secure for HTTPS domains
        domain: undefined, // Works with any domain
      },
    },
    callbackUrl: {
      name: useSecureCookies ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies, // Only secure for HTTPS domains
        domain: undefined,
      },
    },
    csrfToken: {
      name: useSecureCookies ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies, // Only secure for HTTPS domains
      },
    },
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
        
        // Fixed TypeScript errors - ensure always string
        token.id = (user.id || user.email || '') as string
        token.email = (user.email || '') as string
        token.name = (user.name || '') as string
      }
      
      // On subsequent requests, only refresh role from database if explicitly triggered
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