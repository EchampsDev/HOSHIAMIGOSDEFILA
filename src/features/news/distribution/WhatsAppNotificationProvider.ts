export type NewsNotificationMessage = { title: string; summary: string; url: string; templateName: string }
export type ProviderResult = { providerMessageId: string }

// Implementar únicamente en backend/Cloud Functions. Nunca importar credenciales Meta en React.
export interface WhatsAppNotificationProvider {
  sendNewsNotification(whatsappId: string, message: NewsNotificationMessage): Promise<ProviderResult>
}
