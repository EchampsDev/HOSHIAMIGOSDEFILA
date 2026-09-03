import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultBrattyExperienceSettings, type BrattyExperienceSettings, type BrattyVideoSubmission } from '../domain/types'
import { brattyExperienceRepository } from '../repositories/BrattyExperienceRepository'

const LOCAL_KEY = 'brattypolitan.bratty-experience.v1'
const SUBMISSION_KEY = 'brattypolitan.bratty-submission.v1'
const readLocal = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback }
}

export function useBrattyExperience() {
  const [settings, setSettings] = useState<BrattyExperienceSettings>(() => readLocal(LOCAL_KEY, defaultBrattyExperienceSettings))
  const [submission, setSubmission] = useState<BrattyVideoSubmission | null>(() => readLocal(SUBMISSION_KEY, null))
  const [loading, setLoading] = useState(brattyExperienceRepository.usesFirebase)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!brattyExperienceRepository.usesFirebase) return
    let settingsReady = false
    let submissionReady = false
    const ready = () => { if (settingsReady && submissionReady) setLoading(false) }
    const fail = () => { setError('No fue posible sincronizar la experiencia para Bratty.'); setLoading(false) }
    const unsubscribeSettings = brattyExperienceRepository.subscribeSettings((value) => { settingsReady = true; setSettings(value); ready() }, fail)
    const unsubscribeSubmission = brattyExperienceRepository.subscribeSubmission((value) => { submissionReady = true; setSubmission(value); ready() }, fail)
    return () => { unsubscribeSettings?.(); unsubscribeSubmission?.() }
  }, [])

  const saveSettings = useCallback(async (value: BrattyExperienceSettings) => {
    if (brattyExperienceRepository.usesFirebase) await brattyExperienceRepository.saveSettings(value)
    else { localStorage.setItem(LOCAL_KEY, JSON.stringify(value)); setSettings(value) }
  }, [])
  const saveSubmission = useCallback(async (value: BrattyVideoSubmission) => {
    if (brattyExperienceRepository.usesFirebase) await brattyExperienceRepository.saveSubmission(value)
    else { localStorage.setItem(SUBMISSION_KEY, JSON.stringify(value)); setSubmission(value) }
  }, [])

  return useMemo(() => ({ settings, submission, loading, error, saveSettings, saveSubmission, usesFirebase: brattyExperienceRepository.usesFirebase }), [error, loading, saveSettings, saveSubmission, settings, submission])
}
