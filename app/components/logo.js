export default function Logo({compact=false}){
 return <span className={`brand-lockup${compact?' compact':''}`}><img src="/field-notes-mark.svg" alt="" width="40" height="40"/><span><b>FIELD NOTES</b>{!compact&&<small>CHRIS / OPEN INDEX</small>}</span></span>
}
