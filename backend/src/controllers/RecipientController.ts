import { Request, Response } from 'express'
import { z } from 'zod'
import { RecipientType } from '@prisma/client'
import { RecipientService } from '../services/RecipientService'
import { getPagination, successResponse } from '../utils/pagination'
import { optionalEmail } from '../utils/validation'

const recipientService = new RecipientService()

const createRecipientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  type: z.nativeEnum(RecipientType).optional(),
  document: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: optionalEmail,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  peopleServed: z.coerce.number().int().positive().optional(),
})

const updateRecipientSchema = createRecipientSchema.partial()

export class RecipientController {
  async create(req: Request, res: Response): Promise<void> {
    const data = createRecipientSchema.parse(req.body)
    const recipient = await recipientService.create(data)
    res.status(201).json(successResponse(recipient, 'Receptor cadastrado com sucesso'))
  }

  async list(req: Request, res: Response): Promise<void> {
    const pagination = getPagination(req)
    const filter = {
      includeInactive: req.query.includeInactive === 'true',
      search: req.query.search as string | undefined,
    }
    const result = await recipientService.findAll(filter, pagination)
    res.json(successResponse(result))
  }

  async getById(req: Request, res: Response): Promise<void> {
    const recipient = await recipientService.findById(String(req.params.id), req.user!)
    res.json(successResponse(recipient))
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = updateRecipientSchema.parse(req.body)
    const recipient = await recipientService.update(String(req.params.id), data, req.user!)
    res.json(successResponse(recipient, 'Receptor atualizado com sucesso'))
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    await recipientService.deactivate(String(req.params.id))
    res.status(204).send()
  }
}
