<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <div class="container mx-auto px-4 py-8 max-w-7xl">
      <!-- Header -->
      <header class="text-center mb-12">
        <h1 class="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">AI Opinion Panel</h1>
        <p class="text-gray-300 text-lg">Ask a question and get opinions from 10 randomly selected AI models</p>

        <!-- Connection Status Indicator -->
        <div class="mt-4 flex items-center justify-center gap-2">
          <div
            :class="{
              'bg-yellow-500': connectionStatus === 'connecting',
              'bg-green-500': connectionStatus === 'connected',
              'bg-red-500': connectionStatus === 'disconnected',
            }"
            class="w-2 h-2 rounded-full animate-pulse"
          ></div>
          <span class="text-sm text-gray-400">
            {{ connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected' }}
          </span>
        </div>
      </header>

      <!-- Input Section -->
      <div class="mb-8 max-w-3xl mx-auto">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
          <textarea
            v-model="question"
            :disabled="loading"
            @keydown.enter="handleEnterKey"
            placeholder="What would you like to know? Ask anything..."
            class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows="4"
          />

          <button
            @click="askQuestion"
            :disabled="loading || !question.trim()"
            class="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {{ loading ? 'Asking...' : 'Ask All Models' }}
          </button>
        </div>
      </div>

      <!-- Results Grid -->
      <div v-if="results.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="result in results" :key="result.model" class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:border-purple-400/50 transition-all duration-300">
          <!-- Model Name -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white truncate" :title="result.model">
              {{ formatModelName(result.model) }}
            </h3>

            <!-- Status Badge -->
            <span
              :class="{
                'bg-yellow-500/20 text-yellow-300': result.status === 'loading',
                'bg-green-500/20 text-green-300': result.status === 'success',
                'bg-red-500/20 text-red-300': result.status === 'error',
              }"
              class="px-3 py-1 rounded-full text-xs font-medium"
            >
              {{ result.status }}
            </span>
          </div>

          <!-- Response Content -->
          <div class="text-gray-300 text-sm leading-relaxed max-h-32 overflow-y-auto">
            <div v-if="result.status === 'loading'" class="flex items-center space-x-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent"></div>
              <span>Waiting for response...</span>
            </div>

            <div v-else-if="result.status === 'success'" class="whitespace-pre-wrap">
              {{ result.response }}
            </div>

            <div v-else-if="result.status === 'error'" class="text-red-300"><strong>Error:</strong> {{ result.error }}</div>
          </div>
        </div>
      </div>

      <!-- Reset Button (appears after all results) -->
      <div v-if="results.length > 0" class="mt-8 text-center">
        <button @click="resetResults" class="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl border border-white/20 transform hover:-translate-y-0.5" title="Clear all results">Reset All Results</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading" class="text-center text-gray-400 mt-16">
        <svg class="mx-auto h-24 w-24 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-xl">Ask a question to see responses from multiple AI models</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// State
const question = ref('');
const loading = ref(false);
const sessionId = ref<string | null>(null);
const wsConnection = ref<WebSocket | null>(null);
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected');
const results = ref<
  Array<{
    model: string;
    status: 'loading' | 'success' | 'error';
    response?: string;
    error?: string;
  }>
>([]);

/**
 * Format model name for display
 * Extracts the model name from the full path (e.g., "mistralai/mistral-7b-instruct" -> "Mistral 7B Instruct")
 */
function formatModelName(fullName: string): string {
  const parts = fullName.split('/');
  const modelName = parts[parts.length - 1] || fullName;
  return modelName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Handle Enter key press in textarea
 * Enter submits the form, Shift+Enter adds a new line
 */
function handleEnterKey(event: KeyboardEvent) {
  if (!event.shiftKey) {
    event.preventDefault();
    askQuestion();
  }
}

/**
 * Reset/clear all results but keep the question text
 */
function resetResults() {
  results.value = [];
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
  connectionStatus.value = 'connecting';

  // Connect to WebSocket server on port 3001
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const wsUrl = `${protocol}//${host}:3001`;

  console.log('Connecting to WebSocket:', wsUrl);

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    connectionStatus.value = 'connected';
  };

  ws.onmessage = event => {
    try {
      const message = JSON.parse(event.data);
      console.log('📨 Received message:', message);

      switch (message.type) {
        case 'connected':
          // Store session ID from server
          sessionId.value = message.sessionId;
          console.log('Session ID:', sessionId.value);
          break;

        case 'models_selected':
          // Initialize results with loading state for selected models
          results.value = message.models.map((model: string) => ({
            model,
            status: 'loading' as const,
          }));
          break;

        case 'result':
          // Update specific model result
          const resultData = message.data;
          const index = results.value.findIndex(r => r.model === resultData.model);
          if (index !== -1) {
            results.value[index] = resultData;
          }
          break;

        case 'complete':
          // All models have responded
          loading.value = false;
          console.log('✅ All models completed');
          break;

        case 'error':
          // Global error
          console.error('WebSocket error:', message.error);
          loading.value = false;
          break;

        case 'pong':
          // Heartbeat response
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onerror = error => {
    console.error('❌ WebSocket error:', error);
    connectionStatus.value = 'disconnected';
  };

  ws.onclose = () => {
    console.log('❌ WebSocket disconnected');
    connectionStatus.value = 'disconnected';
    wsConnection.value = null;
    sessionId.value = null;

    // Attempt to reconnect after 3 seconds
    setTimeout(() => {
      if (connectionStatus.value === 'disconnected') {
        console.log('Attempting to reconnect...');
        connectWebSocket();
      }
    }, 3000);
  };

  wsConnection.value = ws;
}

/**
 * Send question to all models via API
 */
async function askQuestion() {
  if (!question.value.trim()) return;

  if (!sessionId.value) {
    console.error('No session ID available. WebSocket not connected.');
    return;
  }

  if (connectionStatus.value !== 'connected') {
    console.error('WebSocket not connected');
    return;
  }

  loading.value = true;
  results.value = []; // Clear previous results

  try {
    // Call the API with session ID
    const response = await $fetch('/api/ask', {
      method: 'POST',
      body: {
        question: question.value,
        sessionId: sessionId.value,
      },
    });

    console.log('API Response:', response);
    // Results will arrive via WebSocket
  } catch (error: any) {
    console.error('Error asking question:', error);
    loading.value = false;

    // Show error for all models
    results.value = [
      {
        model: 'Error',
        status: 'error' as const,
        error: error.data?.statusMessage || error.message || 'Failed to send request',
      },
    ];
  }
}

// Lifecycle hooks
onMounted(() => {
  connectWebSocket();
});

onUnmounted(() => {
  if (wsConnection.value) {
    wsConnection.value.close();
  }
});
</script>
