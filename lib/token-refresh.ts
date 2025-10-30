// Token refresh utility for Microsoft Graph
export class TokenRefreshService {
  private clientId: string
  private clientSecret: string
  private tenantId: string

  constructor(clientId: string, clientSecret: string, tenantId: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.tenantId = tenantId
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      console.log('🔄 Refreshing access token...')
      
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'openid profile email User.Read Mail.Read Mail.ReadWrite Mail.Send'
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Token refresh failed:', errorData)
        throw new Error(`Token refresh failed: ${errorData}`)
      }

      const tokenData = await response.json()
      console.log('✅ Token refreshed successfully')
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresIn: tokenData.expires_in
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error)
      throw error
    }
  }

  isTokenExpired(accessToken: string): boolean {
    try {
      const tokenParts = accessToken.split('.')
      if (tokenParts.length !== 3) return true
      
      const payload = JSON.parse(atob(tokenParts[1]))
      const now = Math.floor(Date.now() / 1000)
      const exp = payload.exp
      
      // Consider token expired if it expires within the next 5 minutes
      return now > (exp - 300)
    } catch (error) {
      console.error('❌ Error checking token expiration:', error)
      return true
    }
  }

  getTokenInfo(accessToken: string): { name: string; email: string; expires: Date; expired: boolean } | null {
    try {
      const tokenParts = accessToken.split('.')
      if (tokenParts.length !== 3) return null
      
      const payload = JSON.parse(atob(tokenParts[1]))
      const now = Math.floor(Date.now() / 1000)
      const exp = payload.exp
      
      return {
        name: payload.name || payload.unique_name || 'Unknown',
        email: payload.unique_name || payload.preferred_username || 'Unknown',
        expires: new Date(exp * 1000),
        expired: now > exp
      }
    } catch (error) {
      console.error('❌ Error parsing token:', error)
      return null
    }
  }
}


