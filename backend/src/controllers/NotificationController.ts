import { Request, Response } from 'express'
import { NotificationService } from '../services/NotificationService'
import { successResponse } from '../utils/pagination'

const notificationService = new NotificationService()

export class NotificationController {
  async list(req: Request, res: Response): Promise<void> {
    const result = await notificationService.list(req.user!.id, {
      unreadOnly: req.query.unread === 'true',
      limit: Number(req.query.limit) || undefined,
    })
    res.json(successResponse(result))
  }

  async markRead(req: Request, res: Response): Promise<void> {
    const notification = await notificationService.markRead(String(req.params.id), req.user!.id)
    res.json(successResponse(notification))
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    const result = await notificationService.markAllRead(req.user!.id)
    res.json(successResponse(result))
  }
}
