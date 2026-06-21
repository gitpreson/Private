import { createMockAdapter } from './mock.mjs';
import { createSynapseAdapter } from './synapse.mjs';

export function createAdapter(env = process.env) {
  const mode = env.ADMIN_BACKEND_MODE || 'mock';

  if (mode === 'synapse') {
    return createSynapseAdapter({
      baseUrl: env.SYNAPSE_ADMIN_API_BASE_URL || 'http://127.0.0.1:8008',
      accessToken: env.SYNAPSE_ADMIN_TOKEN,
    });
  }

  return createMockAdapter();
}
