import { Hono } from 'hono'
import { termsPage } from '../views/terms.js'

export const termsRoute = new Hono()

termsRoute.get('/', (c) => c.html(termsPage()))
