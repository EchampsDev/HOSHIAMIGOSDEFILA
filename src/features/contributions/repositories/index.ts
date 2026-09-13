import { isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import { FirestoreContributionRepository } from './FirestoreContributionRepository'
import { LocalContributionRepository } from './LocalContributionRepository'
import type { ContributionRepository } from './ContributionRepository'

export const contributionRepository: ContributionRepository = isFirebaseConfigured ? new FirestoreContributionRepository() : new LocalContributionRepository()
