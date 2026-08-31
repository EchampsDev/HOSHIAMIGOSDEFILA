import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, where } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import type { NewsDraft, NewsItem, NewsPublishedEvent } from '../domain/types'

const newsCollection = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return collection(firestore, 'news')
}
const publicCollection = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return collection(firestore, 'publishedNews')
}
const slugReference = (slug: string) => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'newsSlugs', slug)
}
const normalize = (id: string, value: Partial<NewsItem>): NewsItem => ({
  id, title: value.title ?? '', description: value.description ?? '', slug: value.slug ?? id,
  images: Array.isArray(value.images) ? value.images : [], carouselAlt: value.carouselAlt,
  instagramUrl: value.instagramUrl, facebookUrl: value.facebookUrl, xUrl: value.xUrl, tiktokUrl: value.tiktokUrl,
  order: Number(value.order ?? 0), visible: value.visible !== false, status: value.status ?? 'draft',
  publishedAt: value.publishedAt, publishedBy: value.publishedBy,
  createdAt: value.createdAt ?? new Date().toISOString(), updatedAt: value.updatedAt ?? new Date().toISOString(), deletedAt: value.deletedAt,
})

const withoutUndefined = <T,>(value: T): T => {
  if (Array.isArray(value)) return value.map(withoutUndefined) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, withoutUndefined(entry)])) as T
  }
  return value
}

const firestoreValue = <T,>(value: T) => withoutUndefined(value)
const publicValue = (item: NewsItem) => firestoreValue({ ...item, status: 'published' as const })

export const newsRepository = {
  usesFirebase: isFirebaseConfigured,
  subscribeAdmin(listener: (items: NewsItem[]) => void, onError: (error: unknown) => void) {
    if (!isFirebaseConfigured) { listener([]); return undefined }
    return onSnapshot(query(newsCollection(), orderBy('order', 'asc')), (snapshot) => listener(snapshot.docs.map((entry) => normalize(entry.id, entry.data())).filter((item) => !item.deletedAt)), onError)
  },
  subscribePublished(listener: (items: NewsItem[]) => void, onError: (error: unknown) => void) {
    if (!isFirebaseConfigured) { listener([]); return undefined }
    return onSnapshot(query(publicCollection(), orderBy('order', 'asc')), (snapshot) => listener(snapshot.docs.map((entry) => normalize(entry.id, entry.data())).filter((item) => item.visible)), onError)
  },
  async findPublishedBySlug(slug: string) {
    const result = await getDocs(query(publicCollection(), where('slug', '==', slug), limit(1)))
    return result.empty ? null : normalize(result.docs[0].id, result.docs[0].data())
  },
  async create(draft: NewsDraft) {
    const database = firestore
    if (!database) throw new Error('Firebase no está configurado.')
    const reference = doc(newsCollection())
    const now = new Date().toISOString()
    await runTransaction(database, async (transaction) => {
      const slug = slugReference(draft.slug)
      const slugSnapshot = await transaction.get(slug)
      if (slugSnapshot.exists()) throw new Error('Ese slug ya pertenece a otra noticia.')
      transaction.set(slug, { newsId: reference.id, createdAt: now })
      transaction.set(reference, firestoreValue({ ...draft, status: 'draft', createdAt: now, updatedAt: now }))
    })
    return reference.id
  },
  async save(item: NewsItem) {
    const database = firestore
    if (!database) throw new Error('Firebase no está configurado.')
    const updated = { ...item, updatedAt: new Date().toISOString() }
    await runTransaction(database, async (transaction) => {
      const sourceReference = doc(database, 'news', item.id)
      const currentSnapshot = await transaction.get(sourceReference)
      if (!currentSnapshot.exists()) throw new Error('La noticia ya no existe.')
      const current = normalize(item.id, currentSnapshot.data())
      if (item.status === 'published' && !item.publishedAt) throw new Error('Usa la acción Publicar para publicar por primera vez.')
      if (current.publishedAt && current.slug !== item.slug) throw new Error('El slug de una noticia publicada no puede cambiar.')
      const targetSlug = slugReference(item.slug)
      const slugSnapshot = await transaction.get(targetSlug)
      if (slugSnapshot.exists() && slugSnapshot.data().newsId !== item.id) throw new Error('Ese slug ya pertenece a otra noticia.')
      if (current.slug !== item.slug) transaction.delete(slugReference(current.slug))
      transaction.set(targetSlug, { newsId: item.id, createdAt: current.createdAt })
      transaction.set(sourceReference, firestoreValue(updated))
      const publicReference = doc(database, 'publishedNews', item.id)
      if (item.status === 'published' && item.visible) transaction.set(publicReference, publicValue(updated))
      else transaction.delete(publicReference)
    })
  },
  async publish(item: NewsItem, adminUid: string) {
    const database = firestore
    if (!database) throw new Error('Firebase no está configurado.')
    const sourceReference = doc(database, 'news', item.id)
    const publicReference = doc(database, 'publishedNews', item.id)
    const eventReference = doc(database, 'newsPublishingEvents', item.id)
    await runTransaction(database, async (transaction) => {
      const currentSnapshot = await transaction.get(sourceReference)
      if (!currentSnapshot.exists()) throw new Error('La noticia ya no existe.')
      const current = normalize(item.id, currentSnapshot.data() ?? item)
      if (current.publishedAt && current.slug !== item.slug) throw new Error('El slug de una noticia publicada no puede cambiar.')
      const targetSlug = slugReference(item.slug)
      const slugSnapshot = await transaction.get(targetSlug)
      if (slugSnapshot.exists() && slugSnapshot.data().newsId !== item.id) throw new Error('Ese slug ya pertenece a otra noticia.')
      const firstPublication = !current.publishedAt
      const now = new Date().toISOString()
      const published = { ...item, status: 'published' as const, visible: true, publishedAt: current.publishedAt ?? now, publishedBy: current.publishedBy ?? adminUid, updatedAt: now }
      if (current.slug !== item.slug) transaction.delete(slugReference(current.slug))
      transaction.set(targetSlug, { newsId: item.id, createdAt: current.createdAt })
      transaction.set(sourceReference, firestoreValue(published))
      transaction.set(publicReference, publicValue(published))
      if (firstPublication) transaction.set(eventReference, {
        id: eventReference.id, type: 'NEWS_PUBLISHED', newsId: item.id, slug: item.slug, title: item.title,
        summary: item.description.slice(0, 240), publishedAt: now, publishedBy: adminUid, distributionRequested: true,
      } satisfies NewsPublishedEvent)
    })
  },
  async setVisibility(item: NewsItem, visible: boolean) { await this.save({ ...item, visible }) },
  async archive(item: NewsItem) { await this.save({ ...item, status: 'archived', visible: false }) },
  async softDelete(item: NewsItem) {
    const database = firestore
    if (!database) throw new Error('Firebase no está configurado.')
    const deletedAt = new Date().toISOString()
    await runTransaction(database, async (transaction) => {
      transaction.update(doc(database, 'news', item.id), { status: 'archived', visible: false, deletedAt, updatedAt: deletedAt })
      transaction.delete(doc(database, 'publishedNews', item.id))
    })
  },
}
