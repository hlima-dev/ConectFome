import { Request, Response } from 'express'
import { z } from 'zod'
import { VehicleService } from '../services/VehicleService'
import { getPagination, successResponse } from '../utils/pagination'

const vehicleService = new VehicleService()

const createVehicleSchema = z.object({
  plate: z.string().min(1, 'Placa é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  capacityKg: z.coerce.number().positive().optional(),
})

const updateVehicleSchema = createVehicleSchema.partial()

export class VehicleController {
  async create(req: Request, res: Response): Promise<void> {
    const data = createVehicleSchema.parse(req.body)
    const vehicle = await vehicleService.create(data)
    res.status(201).json(successResponse(vehicle, 'Veículo cadastrado com sucesso'))
  }

  async list(req: Request, res: Response): Promise<void> {
    const pagination = getPagination(req)
    const filter = {
      includeInactive: req.query.includeInactive === 'true',
      search: req.query.search as string | undefined,
    }
    const result = await vehicleService.findAll(filter, pagination)
    res.json(successResponse(result))
  }

  async getById(req: Request, res: Response): Promise<void> {
    const vehicle = await vehicleService.findById(String(req.params.id))
    res.json(successResponse(vehicle))
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = updateVehicleSchema.parse(req.body)
    const vehicle = await vehicleService.update(String(req.params.id), data)
    res.json(successResponse(vehicle, 'Veículo atualizado com sucesso'))
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    await vehicleService.deactivate(String(req.params.id))
    res.status(204).send()
  }
}
