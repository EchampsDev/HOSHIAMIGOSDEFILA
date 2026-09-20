import { useParams } from 'react-router-dom'
import { BrattychartsSectionPage } from './BrattychartsSectionPage'

export function BrattychartsProfilePage() {
  const { username = '' } = useParams()
  return <BrattychartsSectionPage eyebrow="COMUNIDAD · PERFIL" title={username ? `@${username}` : 'Perfil'} intro="Perfiles públicos de la comunidad Brattycharts." />
}

