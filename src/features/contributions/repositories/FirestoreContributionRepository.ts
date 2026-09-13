import { collection, doc, onSnapshot, query, runTransaction, setDoc, where } from 'firebase/firestore'
import { firestore } from '../../../infrastructure/firebase/client'
import { createDefaultAlbum } from '../../album/data/defaultAlbum'
import { pageCapacity, type ScrapbookPage } from '../../album/domain/types'
import { materializeContribution } from '../domain/materializeContribution'
import type { ContributionInput, ContributionRecord } from '../domain/types'
import type { ContributionRepository } from './ContributionRepository'

const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const contributionId = (input: ContributionInput) => input.id ?? input.media?.objectKey?.match(/^photos\/([0-9a-f-]+)\./)?.[1] ?? crypto.randomUUID()

export class FirestoreContributionRepository implements ContributionRepository {
  readonly usesFirebase = true
  private readonly database = firestore
  private ensureDatabase() { if (!this.database) throw new Error('Firebase no está configurado.') }

  async submit(input: ContributionInput) {
    this.ensureDatabase()
    const now = new Date().toISOString()
    const record: ContributionRecord = clean({ ...input, id: contributionId(input), participantId: input.author.participantId, status: 'PENDING', createdAt: now, updatedAt: now })
    await setDoc(doc(this.database!, 'contributions', record.id), record)
    return record
  }

  subscribePending(listener: (items: ContributionRecord[]) => void, onError?: (error: unknown) => void) {
    this.ensureDatabase()
    return onSnapshot(query(collection(this.database!, 'contributions'), where('status', '==', 'PENDING')), (snapshot) => {
      listener(snapshot.docs.map((item) => {
        const data = item.data() as ContributionRecord
        return { ...data, visibility: data.visibility ?? 'PUBLIC' }
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    }, (error) => onError?.(error))
  }

  async approve(id: string, adminUid: string) {
    this.ensureDatabase()
    await runTransaction(this.database!, async (transaction) => {
      const contributionRef = doc(this.database!, 'contributions', id)
      const contributionSnapshot = await transaction.get(contributionRef)
      if (!contributionSnapshot.exists()) throw new Error('La aportación ya no existe.')
      const storedContribution = contributionSnapshot.data() as ContributionRecord
      const contribution: ContributionRecord = { ...storedContribution, visibility: storedContribution.visibility ?? 'PUBLIC' }
      if (contribution.status !== 'PENDING') return
      const defaultPage = createDefaultAlbum().pages[contribution.pageNumber - 1]
      if (!defaultPage) throw new Error('La página seleccionada no existe.')
      const pageRef = doc(this.database!, 'pages', defaultPage.id)
      const pageSnapshot = await transaction.get(pageRef)
      const page = (pageSnapshot.exists() ? pageSnapshot.data() : defaultPage) as ScrapbookPage
      if (pageCapacity(page).isFull) throw new Error('La cara elegida ya contiene cuatro elementos.')
      const element = materializeContribution(contribution, page)
      const now = new Date().toISOString()
      transaction.set(pageRef, clean({ ...page, elements: [...page.elements, element], updatedAt: now }))
      if (contribution.type === 'PHOTO' && contribution.media?.provider === 'r2' && contribution.media.objectKey) {
        transaction.set(doc(this.database!, 'approvedMedia', contribution.id), { objectKey: contribution.media.objectKey, visibility: contribution.visibility, approvedAt: now })
      }
      transaction.update(contributionRef, { status: 'APPROVED', reviewedAt: now, reviewedBy: adminUid, updatedAt: now })
    })
  }

  async reject(id: string, adminUid: string) {
    this.ensureDatabase()
    const now = new Date().toISOString()
    await runTransaction(this.database!, async (transaction) => {
      const reference = doc(this.database!, 'contributions', id)
      const snapshot = await transaction.get(reference)
      if (snapshot.exists() && snapshot.data().status === 'PENDING') transaction.update(reference, { status: 'REJECTED', reviewedAt: now, reviewedBy: adminUid, updatedAt: now })
    })
  }
}
