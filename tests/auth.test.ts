import { authOptions } from '@/lib/auth'

describe('Authentication Logic', () => {
    const signInCallback = authOptions.callbacks?.signIn

    if (!signInCallback) {
        throw new Error('signIn callback is not defined')
    }

    it('should allow users with @rsautomation.net email (lowercase)', async () => {
        const result = await signInCallback({
            user: { email: 'test@rsautomation.net' },
            account: { provider: 'azure-ad' } as any,
            profile: {} as any,
            email: { verificationRequest: false }
        })
        expect(result).toBe(true)
    })

    it('should allow users with @rsautomation.net email (mixed case)', async () => {
        const result = await signInCallback({
            user: { email: 'Test@RsAutomation.net' },
            account: { provider: 'azure-ad' } as any,
            profile: {} as any,
            email: { verificationRequest: false }
        })
        expect(result).toBe(true)
    })

    it('should allow users with @rsautom.onmicrosoft.com email', async () => {
        const result = await signInCallback({
            user: { email: 'jonadmin@rsautom.onmicrosoft.com' },
            account: { provider: 'azure-ad' } as any,
            profile: {} as any,
            email: { verificationRequest: false }
        })
        expect(result).toBe(true)
    })

    it('should deny users with other domains', async () => {
        const result = await signInCallback({
            user: { email: 'test@gmail.com' },
            account: { provider: 'azure-ad' } as any,
            profile: {} as any,
            email: { verificationRequest: false }
        })
        expect(result).toBe(false)
    })

    it('should deny when email is missing', async () => {
        const result = await signInCallback({
            user: { email: null },
            account: { provider: 'azure-ad' } as any,
            profile: {} as any,
            email: { verificationRequest: false }
        })
        expect(result).toBe(false)
    })
})
