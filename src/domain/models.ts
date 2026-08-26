export type ExperiencePhase = 'PRE_EVENT' | 'LIVE_EVENT' | 'REVEAL_COUNTDOWN' | 'REVEALED'
export type ElementType = 'PHOTO' | 'POST_IT' | 'HANDWRITTEN_NOTE' | 'DRAWING' | 'STICKER' | 'TICKET' | 'OTHER'
export type ElementPresence = 'PHYSICAL_ONLY' | 'DIGITAL_ONLY' | 'HYBRID'
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type RepresentationMode = 'FULL_CONTENT' | 'PLACEHOLDER'
export interface Consent { contentVisibility: 'PUBLIC' | 'PRIVATE'; identityVisibility: 'PUBLIC' | 'PRIVATE' | 'ANONYMOUS'; updatedAt: Date }
export interface Participant { id: string; displayName?: string; createdAt: Date }
export interface ElementLayout { x: number; y: number; width: number; height?: number; rotation: number; zIndex: number; locked: boolean; hidden: boolean; styleVariant?: string }
export interface AlbumElement { id: string; participantId: string; pageId?: string; type: ElementType; presence: ElementPresence; consent: Consent; moderationStatus: ModerationStatus; representationMode: RepresentationMode; mediaUrl?: string; layout?: ElementLayout; createdAt: Date; updatedAt: Date }
export interface AlbumPage { id: string; pageNumber: number; title?: string; background?: string }
