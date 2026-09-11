import { Router } from 'express'

import { authRouter } from './auth.routes'
import { donorRouter } from './donors.routes'
import { recipientRouter } from './recipients.routes'
// Fases seguintes: donations, volunteers, vehicles, pickup-routes, reports.

const router = Router()

router.use('/auth', authRouter)
router.use('/donors', donorRouter)
router.use('/recipients', recipientRouter)

export { router }
