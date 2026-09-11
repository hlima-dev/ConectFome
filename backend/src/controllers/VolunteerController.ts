import { Request, Response } from 'express'
import { z } from 'zod'
import { VolunteerService } from '../services/VolunteerService'
import { getPagination, successResponse } from '../utils/pagination'

const volunteerService = new VolunteerService()

const createVolunteerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  document: z.string().min(1, 'Documento é obrigatório'),
  phone: z.string().optional(),
})

const updateVolunteerSchema = createVolunteerSchema.partial()

export class VolunteerController {
  async create(req: Request, res: Response): Promise<void> {
    const data = createVolunteerSchema.parse(req.body)
    const volunteer = await volunteerService.create(data)
    res.status(201).json(successResponse(volunteer, 'Voluntário cadastrado com sucesso'))
  }

  async list(req: Request, res: Response): Promise<void> {
    const pagination = getPagination(req)
    const filter = {
      includeInactive: req.query.includeInactive === 'true',
      search: req.query.search as string | undefined,
    }
    const result = await volunteerService.findAll(filter, pagination)
    res.json(successResponse(result))
  }

  async getById(req: Request, res: Response): Promise<void> {
    const volunteer = await volunteerService.findById(String(req.params.id))
    res.json(successResponse(volunteer))
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = updateVolunteerSchema.parse(req.body)
    const volunteer = await volunteerService.update(String(req.params.id), data)
    res.json(successResponse(volunteer, 'Voluntário atualizado com sucesso'))
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    await volunteerService.deactivate(String(req.params.id))
    res.status(204).send()
  }
}
