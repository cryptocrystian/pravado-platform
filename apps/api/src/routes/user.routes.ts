import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Permission } from '@pravado/shared-types';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getCurrentUser);
router.get('/', authorize(Permission.USER_READ), userController.getUsers);
router.get('/:id', authorize(Permission.USER_READ), userController.getUserById);
router.patch('/:id', authorize(Permission.USER_WRITE), userController.updateUser);
router.delete('/:id', authorize(Permission.USER_DELETE), userController.deleteUser);

export default router;
