import { Router } from 'express'
import { Role } from '@prisma/client'
import { ReportController } from '../controllers/ReportController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()
const controller = new ReportController()

router.use(authenticate, authorize(Role.ADMIN))

router.get('/monthly-kg', (req, res) => controller.monthlyKg(req, res))
router.get('/by-donor', (req, res) => controller.byDonor(req, res))
router.get('/by-recipient', (req, res) => controller.byRecipient(req, res))
router.get('/summary', (req, res) => controller.summary(req, res))

export { router as reportRouter }
