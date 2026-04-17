import { Hono } from 'hono'
import { privacyPage } from '../views/privacy.js'

export const privacyRoute = new Hono()

privacyRoute.get('/', (c) => c.html(privacyPage()))
