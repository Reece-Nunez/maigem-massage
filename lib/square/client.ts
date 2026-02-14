import { SquareClient, SquareEnvironment } from 'square'

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
})

export const catalogApi = squareClient.catalog
export const customersApi = squareClient.customers
export const bookingsApi = squareClient.bookings
export const paymentsApi = squareClient.payments
export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID!
