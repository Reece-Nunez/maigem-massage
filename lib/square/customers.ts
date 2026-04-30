import { customersApi } from './client'
import { v4 as uuidv4 } from 'uuid'

interface CustomerData {
  first_name: string
  last_name: string
  email: string
  phone: string
}

export async function findOrCreateSquareCustomer(data: CustomerData): Promise<string> {
  // Search for existing customer by email
  const searchResponse = await customersApi.search({
    query: {
      filter: {
        emailAddress: {
          exact: data.email,
        },
      },
    },
  })

  const existingCustomer = searchResponse.customers?.[0]
  if (existingCustomer?.id) {
    return existingCustomer.id
  }

  // Create new customer
  const createResponse = await customersApi.create({
    idempotencyKey: uuidv4(),
    givenName: data.first_name,
    familyName: data.last_name,
    emailAddress: data.email,
    phoneNumber: data.phone,
  })

  const newCustomerId = createResponse.customer?.id
  if (!newCustomerId) {
    throw new Error('Failed to create Square customer')
  }

  return newCustomerId
}

interface UpdateCustomerParams {
  squareCustomerId: string
  first_name: string
  last_name: string
  email: string
  phone: string
}

export async function updateSquareCustomer(
  params: UpdateCustomerParams
): Promise<void> {
  await customersApi.update({
    customerId: params.squareCustomerId,
    givenName: params.first_name,
    familyName: params.last_name,
    emailAddress: params.email,
    phoneNumber: params.phone,
  })
}

export async function deleteSquareCustomer(customerId: string): Promise<void> {
  await customersApi.delete({ customerId })
}
