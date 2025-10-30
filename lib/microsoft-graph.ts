import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'

interface GraphAuthProvider extends AuthenticationProvider {
  getAccessToken(): Promise<string>
}

class MicrosoftGraphService {
  private client: Client
  private authProvider: GraphAuthProvider
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
    this.authProvider = {
      getAccessToken: async () => {
        console.log('🔑 Graph client requesting access token')
        return this.accessToken
      }
    }
    
    this.client = Client.initWithMiddleware({
      authProvider: this.authProvider
    })
  }

  // Email operations
  async getMessages(folderId: string = 'inbox', top: number = 50, skip: number = 0) {
    try {
      const messages = await this.client
        .me
        .mailFolders(folderId)
        .messages
        .get({
          queryParameters: {
            $top: top,
            $skip: skip,
            $orderby: 'receivedDateTime desc',
            $select: 'id,subject,body,bodyPreview,from,toRecipients,receivedDateTime,isRead,isImportant,hasAttachments,conversationId,parentFolderId'
          }
        })
      
      return messages
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw error
    }
  }

  // Alias for getMessages to match the API call
  async getEmails(options: { top?: number; orderby?: string; filter?: string } = {}) {
    try {
      console.log('📧 Microsoft Graph: Fetching emails with options:', options)
      
      const queryParams: any = {
        $top: options.top || 50,
        $orderby: options.orderby || 'receivedDateTime desc',
        $select: 'id,subject,body,bodyPreview,from,toRecipients,receivedDateTime,isRead,importance,hasAttachments,conversationId,parentFolderId'
      }
      
      if (options.filter) {
        queryParams.$filter = options.filter
      }

      console.log('🔍 Microsoft Graph: Query params:', queryParams)

      const response = await this.client
        .me
        .messages
        .get({
          queryParameters: queryParams
        })
      
      console.log('✅ Microsoft Graph: Response received, email count:', response.value?.length || 0)
      return response.value || []
    } catch (error) {
      console.error('❌ Microsoft Graph: Error fetching emails:', error)
      throw error
    }
  }

  async getMessage(messageId: string) {
    try {
      const message = await this.client
        .me
        .messages(messageId)
        .get({
          queryParameters: {
            $select: 'id,subject,body,bodyPreview,from,toRecipients,receivedDateTime,isRead,isImportant,hasAttachments,conversationId,parentFolderId,attachments'
          }
        })
      
      return message
    } catch (error) {
      console.error('Error fetching message:', error)
      throw error
    }
  }

  async getAttachments(messageId: string) {
    try {
      const attachments = await this.client
        .me
        .messages(messageId)
        .attachments
        .get()
      
      return attachments
    } catch (error) {
      console.error('Error fetching attachments:', error)
      throw error
    }
  }

  async getAttachment(messageId: string, attachmentId: string) {
    try {
      const attachment = await this.client
        .me
        .messages(messageId)
        .attachments(attachmentId)
        .get()
      
      return attachment
    } catch (error) {
      console.error('Error fetching attachment:', error)
      throw error
    }
  }

  async sendMessage(message: {
    toRecipients: Array<{ emailAddress: { address: string; name?: string } }>
    subject: string
    body: {
      contentType: 'text' | 'html'
      content: string
    }
    attachments?: Array<{
      '@odata.type': string
      name: string
      contentType: string
      contentBytes: string
    }>
  }) {
    try {
      const sentMessage = await this.client
        .me
        .sendMail
        .post({
          message: {
            ...message,
            from: undefined // Will use the authenticated user's email
          }
        })
      
      return sentMessage
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  async markAsRead(messageId: string) {
    try {
      await this.client
        .me
        .messages(messageId)
        .patch({
          isRead: true
        })
    } catch (error) {
      console.error('Error marking message as read:', error)
      throw error
    }
  }

  async markAsUnread(messageId: string) {
    try {
      await this.client
        .me
        .messages(messageId)
        .patch({
          isRead: false
        })
    } catch (error) {
      console.error('Error marking message as unread:', error)
      throw error
    }
  }

  async moveMessage(messageId: string, destinationFolderId: string) {
    try {
      await this.client
        .me
        .messages(messageId)
        .move
        .post({
          destinationId: destinationFolderId
        })
    } catch (error) {
      console.error('Error moving message:', error)
      throw error
    }
  }

  async deleteMessage(messageId: string) {
    try {
      await this.client
        .me
        .messages(messageId)
        .delete()
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  // Folder operations
  async getMailFolders() {
    try {
      const folders = await this.client
        .me
        .mailFolders
        .get()
      
      return folders
    } catch (error) {
      console.error('Error fetching mail folders:', error)
      throw error
    }
  }

  // User profile
  async getUserProfile() {
    try {
      const user = await this.client
        .me
        .get({
          queryParameters: {
            $select: 'id,displayName,mail,userPrincipalName,jobTitle,officeLocation'
          }
        })
      
      return user
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  // Calendar operations (for future use)
  async getEvents(startTime?: string, endTime?: string) {
    try {
      const events = await this.client
        .me
        .calendar
        .events
        .get({
          queryParameters: {
            $select: 'id,subject,start,end,location,attendees,body',
            $filter: startTime && endTime ? 
              `start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'` : 
              undefined
          }
        })
      
      return events
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }
}

export { MicrosoftGraphService }
