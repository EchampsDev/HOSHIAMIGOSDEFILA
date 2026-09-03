export type BrattyExperienceSettings = {
  invitationActive: boolean
  surpriseActive: boolean
}

export type BrattyVideoSubmission = {
  authorName: string
  message: string
  videoUrl: string
  storagePath: string
  originalName: string
  contentType: string
  uploadedAt: string
}

export const defaultBrattyExperienceSettings: BrattyExperienceSettings = {
  invitationActive: false,
  surpriseActive: false,
}
