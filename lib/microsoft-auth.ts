import { Client } from '@microsoft/microsoft-graph-client'

interface MicrosoftAuthConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUri: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export class MicrosoftAuthService {
  private config: MicrosoftAuthConfig

  constructor(config: MicrosoftAuthConfig) {
    this.config = config
  }

  // Generate authorization URL for OAuth flow
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile email User.Read Mail.Read Mail.ReadWrite Mail.Send Calendars.Read Calendars.ReadWrite',
      response_mode: 'query',
      state: state || 'default'
    })

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email User.Read Mail.Read Mail.ReadWrite Mail.Send Calendars.Read Calendars.ReadWrite'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Token exchange failed: ${errorData}`)
    }

    return await response.json()
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid profile email User.Read Mail.Read Mail.ReadWrite Mail.Send Calendars.Read Calendars.ReadWrite'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Token refresh failed: ${errorData}`)
    }

    return await response.json()
  }

  // Get user profile
  async getUserProfile(accessToken: string) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }

    return await response.json()
  }

  // Create Graph client with access token
  createGraphClient(accessToken: string) {
    return Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => accessToken
      }
    })
  }
}

// Helper function to get Microsoft auth service from environment
export function getMicrosoftAuthService(): MicrosoftAuthService | null {
  const config = {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || ''
  }

  if (!config.clientId || !config.clientSecret || !config.tenantId || !config.redirectUri) {
    return null
  }

  return new MicrosoftAuthService(config)
}


