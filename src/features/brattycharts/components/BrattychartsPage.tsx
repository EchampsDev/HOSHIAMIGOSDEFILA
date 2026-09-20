import type { PropsWithChildren, ReactNode } from 'react'
import { Layout } from '../../../components/Layout'
import { BrattychartsWordmark } from './BrattychartsWordmark'

type BrattychartsPageProps = PropsWithChildren<{ eyebrow: string; title: string; intro: string; actions?: ReactNode }>

export function BrattychartsPage({ eyebrow, title, intro, actions, children }: BrattychartsPageProps) {
  return <Layout><main className="brattycharts-page"><header className="brattycharts-page__header">
    <BrattychartsWordmark linked /><p className="brattycharts-page__eyebrow">{eyebrow}</p><h1>{title}</h1>
    <p className="brattycharts-page__intro">{intro}</p>{actions && <div className="brattycharts-page__actions">{actions}</div>}
  </header>{children}</main></Layout>
}

