import { useGoogleSession } from '../../access/useGoogleSession'
import { BrattychartsSectionPage } from './BrattychartsSectionPage'

export function BrattychartsNotificationsPage() {
  const session = useGoogleSession()
  return <BrattychartsSectionPage eyebrow="COMUNIDAD · ACTIVIDAD" title="Notificaciones" intro="Comentarios, respuestas y actividad editorial relevante de Brattycharts." signedInOnly isSignedIn={Boolean(session.user)} onSignIn={() => void session.signIn()} />
}

