import { Router } from 'express'
import { NotificationController } from '../controllers/NotificationController'
import { authenticate } from '../middlewares/auth'

const router = Router()
const controller = new NotificationController()

// Todo usuário autenticado vê apenas as próprias notificações (o filtro por
// userId está no service, nunca em parâmetro da requisição).
router.use(authenticate)

router.get('/', (req, res) => controller.list(req, res))
// Antes de '/:id/read' para "read-all" não ser lido como id.
router.patch('/read-all', (req, res) => controller.markAllRead(req, res))
router.patch('/:id/read', (req, res) => controller.markRead(req, res))

export { router as notificationRouter }
