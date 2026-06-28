import mongoose from 'mongoose'

let isConnected = false
let lastFailureTime: number | null = null
const RETRY_COOLDOWN_MS = 60_000

function isCooldownActive() {
  if (!lastFailureTime) return false
  return Date.now() - lastFailureTime < RETRY_COOLDOWN_MS
}

export async function connectDocumentDB(): Promise<typeof mongoose | null> {
  if (isConnected && mongoose.connections[0]?.readyState === 1) {
    return mongoose
  }

  const uri = process.env.MONGODB_URI || process.env.DOCUMENTDB_URI

  if (!uri) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DocumentDB] No connection string provided. Running in in-memory mode.')
      return null
    }
    throw new Error('DocumentDB connection string not configured.')
  }

  if (isCooldownActive()) {
    if (process.env.NODE_ENV === 'development') {
      return null
    }
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
    })
    isConnected = true
    lastFailureTime = null
    console.info('[DocumentDB] Connected')
    return mongoose
  } catch (error) {
    isConnected = false
    lastFailureTime = Date.now()
    console.error('[DocumentDB] Connection failed', error)
    if (process.env.NODE_ENV !== 'development') {
      throw error
    }
    return null
  }
}

export async function disconnectDocumentDB(): Promise<void> {
  if (!isConnected) return

  await mongoose.disconnect()
  isConnected = false
}
