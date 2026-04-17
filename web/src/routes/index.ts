import { Hono } from 'hono'
import { landingPage } from '../views/landing.js'

export const indexRoute = new Hono()

indexRoute.get('/', (c) => c.html(landingPage()))
