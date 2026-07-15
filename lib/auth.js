export async function getSiteAdmin(db){
 const {data:{user}}=await db.auth.getUser()
 if(!user)return null
 const {data:isAdmin,error}=await db.rpc('is_site_admin')
 if(error||!isAdmin)return null
 return user
}
