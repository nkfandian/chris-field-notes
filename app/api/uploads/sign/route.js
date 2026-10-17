import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3'
import {getSignedUrl} from '@aws-sdk/s3-request-presigner'
import {createClient} from '@/lib/supabase/server'
import {getSiteAdmin} from '@/lib/auth'

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}
const MAX_SIZE = 10 * 1024 * 1024

function r2Config() {
  const {R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL} = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY},
  })
  return {client, bucket: R2_BUCKET, publicUrl: R2_PUBLIC_URL.replace(/\/+$/, '')}
}

// 管理员向 R2 直传图片：先向本接口申请一次性上传地址，浏览器再 PUT 到 R2。
// 文件不经过 Vercel，避免 serverless 的请求体大小限制。
export async function POST(request) {
  const db = await createClient()
  const user = await getSiteAdmin(db)
  if (!user) return Response.json({error: 'unauthorized'}, {status: 401})
  const config = r2Config()
  if (!config) return Response.json({error: 'R2 未配置，请检查环境变量'}, {status: 500})
  let input
  try {
    input = await request.json()
  } catch {
    return Response.json({error: '请求格式无效'}, {status: 400})
  }
  const {filename = '', contentType = '', size = 0} = input || {}
  const ext = IMAGE_TYPES[contentType]
  if (!ext) return Response.json({error: '只支持 JPG / PNG / WebP / GIF / AVIF 图片'}, {status: 400})
  if (!Number.isFinite(size) || size <= 0 || size > MAX_SIZE) return Response.json({error: '图片大小需在 10MB 以内'}, {status: 400})
  const date = new Date().toISOString().slice(0, 10)
  const uuid = crypto.randomUUID().slice(0, 8)
  const safeName = String(filename).replace(/[^\w\-.]+/g, '_').slice(0, 60) || 'image'
  const key = `images/${date}/${uuid}-${safeName}.${ext}`
  const command = new PutObjectCommand({Bucket: config.bucket, Key: key, ContentType: contentType})
  const uploadUrl = await getSignedUrl(config.client, command, {expiresIn: 300})
  return Response.json({uploadUrl, publicUrl: `${config.publicUrl}/${key}`, key})
}
