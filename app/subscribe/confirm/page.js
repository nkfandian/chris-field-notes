import ConfirmClient from './confirm-client'
import '../../studio/studio.css'

export const dynamic='force-dynamic'
export default async function ConfirmSubscription({searchParams}){return <ConfirmClient token={(await searchParams)?.token||''}/>}
