import { FourPointMark } from '../../../components/FourPointMark'

export function ContributionConfirmation({ message }: { message: string }) {
  return <div className="contribution-confirmation" role="status">
    <span className="contribution-confirmation-star" aria-hidden="true"><FourPointMark /></span>
    <div><p>{message}</p><strong>Tu recuerdo fue enviado y está pendiente de aprobación.</strong></div>
  </div>
}
