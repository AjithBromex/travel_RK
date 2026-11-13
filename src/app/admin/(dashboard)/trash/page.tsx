import { getTrashItems } from '@/services/trash.service'
import TrashClient from './trash-client'

export const dynamic = 'force-dynamic'

export default async function TrashPage() {
  const initialTrash = await Promise.race([
    getTrashItems(),
    new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 350)),
  ]).catch(() => [])

  return <TrashClient initialItems={initialTrash} />
}

