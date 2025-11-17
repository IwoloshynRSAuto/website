'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail } from 'lucide-react'

export default function SignInPage() {
  const handleMicrosoftSignIn = () => {
    signIn('azure-ad', { callbackUrl: '/dashboard/home' })
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl lg:text-2xl">Sign In</CardTitle>
          <CardDescription className="text-sm lg:text-base">
            Access the automation firm portal with your Microsoft 365 account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleMicrosoftSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
            size="lg"
          >
            <Mail className="mr-2 h-5 w-5" />
            <span className="text-sm lg:text-base">Sign in with Microsoft 365</span>
          </Button>
          <p className="text-xs lg:text-sm text-gray-600 text-center">
            Only @rsautomation.net email addresses are allowed
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


