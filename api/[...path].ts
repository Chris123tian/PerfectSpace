import { handle } from 'hono/vercel';
import app from '../expo/backend/hono';

export default handle(app);
