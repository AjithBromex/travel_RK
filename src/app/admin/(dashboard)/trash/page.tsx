import { getTrashItems } from '@/services/trash.service'
import TrashClient from './trash-client'

export const dynamic = 'force-dynamic'

export default async function TrashPage() {
  const initialTrash = await getTrashItems().catch(() => [])

  return <TrashClient initialItems={initialTrash} />
}

