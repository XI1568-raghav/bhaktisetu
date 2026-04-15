import { FastifyInstance } from 'fastify';

export async function darshanRoutes(server: FastifyInstance) {
  // GET /live - List all currently live darshan streams
  server.get('/live', async (request, reply) => {
    // TODO: fetch all active live darshan streams
    return {
      streams: [],
      total: 0,
    };
  });

  // GET /scheduled - List upcoming scheduled darshan sessions
  server.get('/scheduled', async (request, reply) => {
    const { templeId, date, page, limit } = request.query as {
      templeId?: string;
      date?: string;
      page?: string;
      limit?: string;
    };
    // TODO: fetch scheduled darshan sessions with optional filters
    return {
      sessions: [],
      total: 0,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    };
  });

  // GET /:id/stream - Get stream details and playback URL
  server.get('/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: fetch stream info, generate signed playback URL (e.g., Mux, AWS IVS)
    return {
      streamId: id,
      templeId: '',
      templeName: '',
      status: 'offline',
      playbackUrl: null,
      thumbnailUrl: null,
      viewerCount: 0,
      startedAt: null,
    };
  });

  // POST /:id/join - Join a live darshan session (track viewers)
  server.post('/:id/join', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: register viewer, increment viewer count, return session token
    return {
      streamId: id,
      sessionToken: '',
      playbackUrl: '',
      message: 'Joined darshan session',
    };
  });

  // POST /:id/leave - Leave a live darshan session
  server.post('/:id/leave', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: decrement viewer count, log watch duration
    return {
      streamId: id,
      message: 'Left darshan session',
    };
  });
}
