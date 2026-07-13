import UnsubscribeClient from './unsubscribe-client'
import '../studio/studio.css'
export default async function Unsubscribe({searchParams}){return <UnsubscribeClient token={(await searchParams)?.token||''}/>}
