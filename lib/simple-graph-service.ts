// Simple Microsoft Graph service using direct fetch calls
export class SimpleGraphService {
  private accessToken: string
  private baseUrl = 'https://graph.microsoft.com/v1.0'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    console.log(`🌐 Making request to: ${url}`)
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Graph API error: ${response.status} ${response.statusText}`)
      console.error(`❌ Error details: ${errorText}`)
      throw new Error(`Graph API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  async getUserProfile() {
    console.log('👤 Fetching user profile...')
    return this.makeRequest('/me')
  }

  async getEmails(options: { top?: number; orderby?: string; filter?: string } = {}) {
    console.log('📧 Fetching emails...')
    
    const params = new URLSearchParams()
    params.append('$top', (options.top || 50).toString())
    params.append('$orderby', options.orderby || 'receivedDateTime desc')
    params.append('$select', 'id,subject,body,bodyPreview,from,toRecipients,receivedDateTime,isRead,importance,hasAttachments,conversationId,parentFolderId')
    
    if (options.filter) {
      params.append('$filter', options.filter)
    }

    const endpoint = `/me/messages?${params.toString()}`
    const response = await this.makeRequest(endpoint)
    
    console.log(`✅ Fetched ${response.value?.length || 0} emails`)
    return response.value || []
  }

  async getMessage(messageId: string) {
    console.log(`📧 Fetching message: ${messageId}`)
    return this.makeRequest(`/me/messages/${messageId}`)
  }

  async markAsRead(messageId: string) {
    console.log(`📧 Marking message as read: ${messageId}`)
    return this.makeRequest(`/me/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true })
    })
  }

  async markAsUnread(messageId: string) {
    console.log(`📧 Marking message as unread: ${messageId}`)
    return this.makeRequest(`/me/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: false })
    })
  }

  async deleteMessage(messageId: string) {
    console.log(`📧 Deleting message: ${messageId}`)
    return this.makeRequest(`/me/messages/${messageId}`, {
      method: 'DELETE'
    })
  }

  async sendMessage(message: {
    toRecipients: Array<{ emailAddress: { address: string; name?: string } }>
    subject: string
    body: {
      contentType: 'text' | 'html'
      content: string
    }
  }) {
    console.log(`📧 Sending message: ${message.subject}`)
    return this.makeRequest('/me/sendMail', {
      method: 'POST',
      body: JSON.stringify({
        message: {
          ...message,
          from: undefined // Will use the authenticated user's email
        }
      })
    })
  }
}


