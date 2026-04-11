import { messagingApi, webhook } from '@line/bot-sdk'
import { prisma } from './prisma'

function getClient() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    throw new Error('LINE Channel Access Token 尚未設定，請至系統設定填入')
  }
  return new messagingApi.MessagingApiClient({ channelAccessToken })
}

export async function sendMessage(lineUserId: string, message: string): Promise<void> {
  const client = getClient()
  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: 'text', text: message }],
  })
}

export async function syncFriends(): Promise<number> {
  // LINE API 不直接提供好友列表，需要透過 Webhook 收集
  // 這裡從資料庫中返回現有好友數量
  const count = await prisma.lineFriend.count()
  return count
}

export function renderTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, key: string) => {
    return row[key.trim()] ?? `{{${key}}}`
  })
}

export async function handleWebhookEvent(event: webhook.Event): Promise<void> {
  if (event.type === 'follow') {
    const followEvent = event as webhook.FollowEvent
    const userId = followEvent.source?.userId
    if (!userId) return

    const client = getClient()
    try {
      const profile = await client.getProfile(userId)
      await prisma.lineFriend.upsert({
        where: { lineUserId: userId },
        create: {
          lineUserId: userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl ?? null,
          statusMessage: profile.statusMessage ?? null,
        },
        update: {
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl ?? null,
          statusMessage: profile.statusMessage ?? null,
          syncedAt: new Date(),
        },
      })
    } catch (err) {
      console.error('Failed to save LINE friend:', err)
    }
  }

  if (event.type === 'unfollow') {
    const unfollowEvent = event as webhook.UnfollowEvent
    const userId = unfollowEvent.source?.userId
    if (!userId) return
    // 可選擇性刪除或標記為 unfollowed
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getClient()
    await client.getBotInfo()
    return true
  } catch {
    return false
  }
}
