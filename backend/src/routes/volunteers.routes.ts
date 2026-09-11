import { Router } from 'express'
import { Role } from '@prisma/client'
import { VolunteerController } from '../controllers/VolunteerController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()
const controller = new VolunteerController()

// Voluntários não têm login próprio — gestão é 100% ADMIN.
router.use(authenticate, authorize(Role.ADMIN))

router.get('/', (req, res) => controller.list(req, res))
router.post('/', (req, res) => controller.create(req, res))
router.get('/:id', (req, res) => controller.getById(req, res))
router.patch('/:id', (req, res) => controller.update(req, res))
router.delete('/:id', (req, res) => controller.deactivate(req, res))

export { router as volunteerRouter }
