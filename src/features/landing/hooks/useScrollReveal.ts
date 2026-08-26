import { useEffect, type RefObject } from 'react'

export function useScrollReveal(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const revealElements = document.querySelectorAll<HTMLElement>('[data-scroll-reveal]')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0 })
    const handleScroll = () => root.classList.toggle('has-started', window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'))
      return () => {
        window.history.scrollRestoration = previousScrollRestoration
        window.removeEventListener('scroll', handleScroll)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: .16, rootMargin: '0px 0px -10% 0px' })

    revealElements.forEach((element) => observer.observe(element))
    return () => {
      observer.disconnect()
      window.history.scrollRestoration = previousScrollRestoration
      window.removeEventListener('scroll', handleScroll)
    }
  }, [rootRef])
}
