import { Router } from 'express'

import { authRouter } from './auth.routes'
import { donorRouter } from './donors.routes'
import { recipientRouter } from './recipients.routes'
import { donationRouter } from './donations.routes'
// Fases seguintes: volunteers, vehicles, pickup-routes, reports.

const router = Router()

router.use('/auth', authRouter)
router.use('/donors', donorRouter)
router.use('/recipients', recipientRouter)
router.use('/donations', donationRouter)

export { router }
