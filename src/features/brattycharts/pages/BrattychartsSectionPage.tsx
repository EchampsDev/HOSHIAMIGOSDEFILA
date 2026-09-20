import { Link } from 'react-router-dom'
import { BrattychartsPage } from '../components/BrattychartsPage'

type BrattychartsSectionPageProps = { eyebrow: string; title: string; intro: string; signedInOnly?: boolean; isSignedIn?: boolean; onSignIn?: () => void }

export function BrattychartsSectionPage({ eyebrow, title, intro, signedInOnly = false, isSignedIn = false, onSignIn }: BrattychartsSectionPageProps) {
  const requiresAccess = signedInOnly && !isSignedIn
  return <BrattychartsPage eyebrow={eyebrow} title={title} intro={intro} actions={requiresAccess ? <button type="button" className="button primary" onClick={onSignIn}>Acceder con Google</button> : undefined}>
    <section className="brattycharts-placeholder" aria-live="polite"><p>{requiresAccess ? 'Accede para consultar esta sección personal.' : 'La ruta está preparada y aislada. Su contenido se incorporará en la fase correspondiente.'}</p><Link to="/brattycharts">← Volver a Brattycharts</Link></section>
  </BrattychartsPage>
}

