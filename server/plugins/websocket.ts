/**
 * WebSocket Server Plugin for Nuxt
 * 
 * This plugin initializes a WebSocket server that handles real-time
 * communication between clients and the server for streaming AI responses.
 * 
 * Key features:
 * - Automatic session ID generation for each client
 * - Client connection tracking and management
 * - Global registry for message routing
 */

import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'

// Global registry of connected WebSocket clients
// Maps sessionId -> WebSocket connection
const wsClients = new Map<string, WebSocket>()

// Global WebSocket server instance
let wss: WebSocketServer | null = null

/**
 * Get the global WebSocket clients registry
 * Used by API routes to send messages to specific clients
 */
export function useWebSocketClients() {
  return wsClients
}

/**
 * Send a message to a specific client by session ID
 */
export function sendToClient(sessionId: string, message: any) {
  const client = wsClients.get(sessionId)
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message))
    return true
  }
  return false
}

export default defineNitroPlugin((nitroApp) => {
  console.log('🔌 Initializing WebSocket plugin...')

  // Create WebSocket server on a separate port to avoid conflicts
  if (!wss) {
    wss = new WebSocketServer({ port: 3001 })
    console.log('🔌 WebSocket server listening on port 3001')
  }

  // Handle new WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    // Generate unique session ID for this client
    const sessionId = uuidv4()

    // Register client in global registry
    wsClients.set(sessionId, ws)

    console.log(`✅ Client connected: ${sessionId} (Total: ${wsClients.size})`)

    // Send session ID to client
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId
    }))

    // Handle client disconnection
    ws.on('close', () => {
      wsClients.delete(sessionId)
      console.log(`❌ Client disconnected: ${sessionId} (Total: ${wsClients.size})`)
    })

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${sessionId}:`, error)
      wsClients.delete(sessionId)
    })

    // Optional: Handle incoming messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        console.log(`📨 Message from ${sessionId}:`, message)

        // Handle ping/pong for connection health
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    })
  })

  // Cleanup on server shutdown
  nitroApp.hooks.hook('close', () => {
    console.log('🔌 Closing WebSocket server...')
    if (wss) {
      wss.close()
    }
    wsClients.clear()
  })
})
