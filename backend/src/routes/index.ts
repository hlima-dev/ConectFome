import { Router } from 'express'

import { authRouter } from './auth.routes'
// Fases seguintes: donors, recipients, donations, volunteers, vehicles,
// pickup-routes, reports.

const router = Router()

router.use('/auth', authRouter)

export { router }
