import {SITE_DESCRIPTION,SITE_LANGUAGE,SITE_NAME} from '@/lib/seo'

export default function manifest(){
  return {
    name:SITE_NAME,
    short_name:'FIELD NOTES',
    description:SITE_DESCRIPTION,
    start_url:'/',
    scope:'/',
    display:'standalone',
    background_color:'#efeee8',
    theme_color:'#151713',
    lang:SITE_LANGUAGE,
    categories:['books','education','lifestyle'],
    icons:[{src:'/field-notes-mark.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]
  }
}
