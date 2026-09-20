import { collection, doc, getDocs, onSnapshot, query, runTransaction, where, writeBatch } from 'firebase/firestore'
import { firestore } from '../../../infrastructure/firebase/client'
import { createDefaultAlbum } from '../../album/data/defaultAlbum'
import { pageCapacity, type ScrapbookPage } from '../../album/domain/types'
import { materializeContribution } from '../domain/materializeContribution'
import type { ContributionInput, ContributionRecord } from '../domain/types'
import type { ContributionRepository, PendingPageCounts } from './ContributionRepository'

const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const contributionId = (input: ContributionInput) => input.id ?? input.media?.objectKey?.match(/^photos\/([0-9a-f-]+)\./)?.[1] ?? crypto.randomUUID()
const pendingCounts = (value: Record<string, unknown> | undefined) => ({ main: Number(value?.pendingMain ?? 0), stickers: Number(value?.pendingStickers ?? 0) })

export class FirestoreContributionRepository implements ContributionRepository {
  readonly usesFirebase = true
  private readonly database = firestore
  private ensureDatabase() { if (!this.database) throw new Error('Firebase no está configurado.') }

  async submit(input: ContributionInput) {
    this.ensureDatabase()
    const now = new Date().toISOString()
    const record: ContributionRecord = clean({ ...input, id: contributionId(input), participantId: input.author.participantId, status: 'PENDING', createdAt: now, updatedAt: now })
    return runTransaction(this.database!, async (transaction) => {
      const reference = doc(this.database!, 'contributions', record.id)
      const snapshot = await transaction.get(reference)
      if (snapshot.exists()) {
        const existing = snapshot.data() as ContributionRecord
        if (existing.participantId !== record.participantId) throw new Error('Este envío ya pertenece a otra cuenta.')
        return existing
      }
      const reservationRef = doc(this.database!, 'pageReservations', String(record.pageNumber))
      const pageLockRef = doc(this.database!, 'pageLocks', String(record.pageNumber))
      const reservationSnapshot = await transaction.get(reservationRef)
      const pageLockSnapshot = await transaction.get(pageLockRef)
      if (pageLockSnapshot.exists() && pageLockSnapshot.data().reserved === true) throw new Error('La cara elegida está reservada por administración. Selecciona otra.')
      const defaultPage = createDefaultAlbum().pages[record.pageNumber - 1]
      if (!defaultPage) throw new Error('La cara elegida no existe.')
      const pageSnapshot = await transaction.get(doc(this.database!, 'pages', defaultPage.id))
      const page = (pageSnapshot.exists() ? pageSnapshot.data() : defaultPage) as ScrapbookPage
      const reserved = pendingCounts(reservationSnapshot.data())
      const capacity = pageCapacity(page)
      if (record.type === 'STICKER' ? capacity.stickersRemaining <= reserved.stickers : capacity.remaining <= reserved.main) throw new Error('La cara elegida ya no tiene espacio. Selecciona otra.')
      transaction.set(reference, record)
      transaction.set(reservationRef, { pageNumber: record.pageNumber, pendingMain: reserved.main + (record.type === 'STICKER' ? 0 : 1), pendingStickers: reserved.stickers + (record.type === 'STICKER' ? 1 : 0), lastSubmissionId: record.id, updatedAt: now })
      return record
    })
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
      const reservationRef = doc(this.database!, 'pageReservations', String(contribution.pageNumber))
      const reservationSnapshot = await transaction.get(reservationRef)
      if (contribution.type === 'STICKER' ? pageCapacity(page).stickersFull : pageCapacity(page).isFull) throw new Error('La cara elegida ya alcanzó el límite para ese tipo de aportación.')
      const element = materializeContribution(contribution, page)
      const now = new Date().toISOString()
      transaction.set(pageRef, clean({ ...page, elements: [...page.elements, element], updatedAt: now }))
      if (reservationSnapshot.exists()) {
        const pending = pendingCounts(reservationSnapshot.data())
        transaction.update(reservationRef, { pendingMain: Math.max(0, pending.main - (contribution.type === 'STICKER' ? 0 : 1)), pendingStickers: Math.max(0, pending.stickers - (contribution.type === 'STICKER' ? 1 : 0)), updatedAt: now })
      }
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
      if (!snapshot.exists() || snapshot.data().status !== 'PENDING') return
      const contribution = snapshot.data() as ContributionRecord
      const reservationRef = doc(this.database!, 'pageReservations', String(contribution.pageNumber))
      const reservationSnapshot = await transaction.get(reservationRef)
      transaction.update(reference, { status: 'REJECTED', reviewedAt: now, reviewedBy: adminUid, updatedAt: now })
      if (reservationSnapshot.exists()) {
        const pending = pendingCounts(reservationSnapshot.data())
        transaction.update(reservationRef, { pendingMain: Math.max(0, pending.main - (contribution.type === 'STICKER' ? 0 : 1)), pendingStickers: Math.max(0, pending.stickers - (contribution.type === 'STICKER' ? 1 : 0)), updatedAt: now })
      }
    })
  }
  subscribeAvailability(listener: (counts: PendingPageCounts) => void, onError?: (error: unknown) => void) {
    this.ensureDatabase()
    return onSnapshot(collection(this.database!, 'pageReservations'), (snapshot) => {
      const counts: PendingPageCounts = {}
      for (const item of snapshot.docs) {
        const pageNumber = Number(item.id)
        if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 100) continue
        const pending = pendingCounts(item.data())
        counts[pageNumber] = pending
      }
      listener(counts)
    }, onError)
  }
  async movePending(id: string, pageNumber: number, adminUid: string) {
    this.ensureDatabase()
    const target = createDefaultAlbum().pages[pageNumber - 1]
    if (!target) throw new Error('La cara de destino no existe.')
    await runTransaction(this.database!, async (transaction) => {
      const reference = doc(this.database!, 'contributions', id)
      const contributionSnapshot = await transaction.get(reference)
      if (!contributionSnapshot.exists() || contributionSnapshot.data().status !== 'PENDING') throw new Error('La aportación ya no está pendiente.')
      const contribution = contributionSnapshot.data() as ContributionRecord
      const pageSnapshot = await transaction.get(doc(this.database!, 'pages', target.id))
      const page = (pageSnapshot.exists() ? pageSnapshot.data() : target) as ScrapbookPage
      if (contribution.pageNumber === pageNumber) return
      const sourceReservationRef = doc(this.database!, 'pageReservations', String(contribution.pageNumber))
      const targetReservationRef = doc(this.database!, 'pageReservations', String(pageNumber))
      const sourceSnapshot = await transaction.get(sourceReservationRef)
      const targetSnapshot = await transaction.get(targetReservationRef)
      const reserved = pendingCounts(targetSnapshot.data())
      const capacity = pageCapacity(page)
      if (contribution.type === 'STICKER' ? capacity.stickersRemaining <= reserved.stickers : capacity.remaining <= reserved.main) throw new Error('Esa cara ya está llena.')
      const now = new Date().toISOString()
      transaction.update(reference, { pageNumber, movedAt: now, movedBy: adminUid, updatedAt: now })
      if (sourceSnapshot.exists()) {
        const source = pendingCounts(sourceSnapshot.data())
        transaction.update(sourceReservationRef, { pendingMain: Math.max(0, source.main - (contribution.type === 'STICKER' ? 0 : 1)), pendingStickers: Math.max(0, source.stickers - (contribution.type === 'STICKER' ? 1 : 0)), updatedAt: now })
      }
      transaction.set(targetReservationRef, { pageNumber, pendingMain: reserved.main + (contribution.type === 'STICKER' ? 0 : 1), pendingStickers: reserved.stickers + (contribution.type === 'STICKER' ? 1 : 0), lastSubmissionId: id, updatedAt: now })
    })
  }
  async deletePending(id: string, adminUid: string) {
    this.ensureDatabase()
    await runTransaction(this.database!, async (transaction) => {
      const reference = doc(this.database!, 'contributions', id)
      const snapshot = await transaction.get(reference)
      if (!snapshot.exists() || snapshot.data().status !== 'PENDING') return
      const contribution = snapshot.data() as ContributionRecord
      const reservationRef = doc(this.database!, 'pageReservations', String(contribution.pageNumber))
      const reservationSnapshot = await transaction.get(reservationRef)
      const now = new Date().toISOString()
      transaction.update(reference, { status: 'DELETED', deletedAt: now, deletedBy: adminUid, updatedAt: now })
      if (reservationSnapshot.exists()) {
        const pending = pendingCounts(reservationSnapshot.data())
        transaction.update(reservationRef, { pendingMain: Math.max(0, pending.main - (contribution.type === 'STICKER' ? 0 : 1)), pendingStickers: Math.max(0, pending.stickers - (contribution.type === 'STICKER' ? 1 : 0)), updatedAt: now })
      }
    })
  }
  async deletePublished(pageId: string, elementId: string, adminUid: string) {
    this.ensureDatabase()
    await runTransaction(this.database!, async (transaction) => {
      const pageRef = doc(this.database!, 'pages', pageId)
      const pageSnapshot = await transaction.get(pageRef)
      if (!pageSnapshot.exists()) throw new Error('La cara ya no existe.')
      const page = pageSnapshot.data() as ScrapbookPage
      const element = page.elements.find((item) => item.id === elementId)
      if (!element || element.layout.hidden) return
      const contributionId = element.contributionId ?? element.media?.objectKey?.match(/^photos\/([0-9a-f-]+)\./)?.[1]
      const contributionRef = contributionId ? doc(this.database!, 'contributions', contributionId) : null
      const contributionSnapshot = contributionRef ? await transaction.get(contributionRef) : null
      const now = new Date().toISOString()
      transaction.update(pageRef, { elements: page.elements.map((item) => item.id === elementId ? { ...item, layout: { ...item.layout, hidden: true }, updatedAt: now } : item), updatedAt: now })
      if (contributionRef && contributionSnapshot?.exists()) transaction.update(contributionRef, { status: 'DELETED', deletedAt: now, deletedBy: adminUid, updatedAt: now })
      if (element.type === 'PHOTO' && contributionId) transaction.delete(doc(this.database!, 'approvedMedia', contributionId))
    })
  }
  async reconcileAvailability() {
    this.ensureDatabase()
    const snapshot = await getDocs(query(collection(this.database!, 'contributions'), where('status', '==', 'PENDING')))
    const counts: PendingPageCounts = {}
    for (const item of snapshot.docs) {
      const contribution = item.data() as ContributionRecord
      const count = counts[contribution.pageNumber] ?? { main: 0, stickers: 0 }
      if (contribution.type === 'STICKER') count.stickers += 1
      else count.main += 1
      counts[contribution.pageNumber] = count
    }
    const batch = writeBatch(this.database!)
    const now = new Date().toISOString()
    for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
      const count = counts[pageNumber] ?? { main: 0, stickers: 0 }
      batch.set(doc(this.database!, 'pageReservations', String(pageNumber)), { pageNumber, pendingMain: count.main, pendingStickers: count.stickers, lastSubmissionId: 'admin-reconciliation', updatedAt: now })
    }
    await batch.commit()
  }
}
