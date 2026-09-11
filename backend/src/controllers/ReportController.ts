import { Request, Response } from 'express'
import { z } from 'zod'
import { ReportService } from '../services/ReportService'
import { successResponse } from '../utils/pagination'

const reportService = new ReportService()

const yearQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
})

const monthlyKgQuerySchema = yearQuerySchema.extend({
  donorId: z.string().optional(),
  recipientId: z.string().optional(),
})

export class ReportController {
  async monthlyKg(req: Request, res: Response): Promise<void> {
    const filter = monthlyKgQuerySchema.parse(req.query)
    const result = await reportService.monthlyKg(filter)
    res.json(successResponse(result))
  }

  async byDonor(req: Request, res: Response): Promise<void> {
    const filter = yearQuerySchema.parse(req.query)
    const result = await reportService.byDonor(filter)
    res.json(successResponse(result))
  }

  async byRecipient(req: Request, res: Response): Promise<void> {
    const filter = yearQuerySchema.parse(req.query)
    const result = await reportService.byRecipient(filter)
    res.json(successResponse(result))
  }

  async summary(_req: Request, res: Response): Promise<void> {
    const result = await reportService.summary()
    res.json(successResponse(result))
  }
}
