import { isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import { FirestoreElementReactionRepository } from './FirestoreElementReactionRepository'
import { LocalElementReactionRepository } from './LocalElementReactionRepository'
import type { ElementReactionRepository } from './ElementReactionRepository'

export const elementReactionRepository: ElementReactionRepository = isFirebaseConfigured
  ? new FirestoreElementReactionRepository()
  : new LocalElementReactionRepository()
