import { PawfileServerTransport } from '@/data/transport/PawfileServerTransport';

function response(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('PawfileServerTransport', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts health checks to the normalized sync endpoint with the secret header', async () => {
    fetchMock.mockResolvedValue(response({ ok: true }));
    const transport = new PawfileServerTransport({
      baseUrl: 'https://server.example/api/sync/',
      secret: 'shared-secret',
    });

    await expect(transport.health()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://server.example/api/sync',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-secret': 'shared-secret',
        }),
      }),
    );
  });

  it('returns rows from pull', async () => {
    fetchMock.mockResolvedValue(response({ ok: true, rows: [{ caseId: '1043' }] }));
    const transport = new PawfileServerTransport({
      baseUrl: 'https://server.example',
      secret: 'shared-secret',
    });

    await expect(transport.pull('Cases', null)).resolves.toEqual([{ caseId: '1043' }]);
  });

  it('maps entity ids in push results back to outbox ids', async () => {
    fetchMock.mockResolvedValue(
      response({
        ok: true,
        succeeded: ['1043'],
        failed: [{ id: '1044', error: 'Missing title' }],
      }),
    );
    const transport = new PawfileServerTransport({
      baseUrl: 'https://server.example',
      secret: 'shared-secret',
    });

    const result = await transport.push('Cases', [
      { id: 'queue-1', type: 'create', payload: JSON.stringify({ caseId: '1043' }) },
      { id: 'queue-2', type: 'create', payload: JSON.stringify({ caseId: '1044' }) },
    ]);

    expect(result).toEqual({
      succeeded: ['queue-1'],
      failed: [{ id: 'queue-2', error: 'Missing title' }],
    });
  });

  it('absolutizes relative media URLs against the server base URL', async () => {
    fetchMock.mockResolvedValue(
      response({
        ok: true,
        file: { fileId: 'file-1', url: '/api/files/file-1?token=abc' },
      }),
    );
    const transport = new PawfileServerTransport({
      baseUrl: 'https://server.example',
      secret: 'shared-secret',
    });

    await expect(
      transport.uploadMedia({
        caseId: '1043',
        category: 'Photos',
        fileName: 'photo.png',
        mimeType: 'image/png',
        base64: 'aGVsbG8=',
      }),
    ).resolves.toEqual({
      fileId: 'file-1',
      url: 'https://server.example/api/files/file-1?token=abc',
    });
  });

  it('surfaces backend errors from the JSON body', async () => {
    fetchMock.mockResolvedValue(response({ ok: false, error: 'Unauthorized' }));
    const transport = new PawfileServerTransport({
      baseUrl: 'https://server.example',
      secret: 'wrong-secret',
    });

    await expect(transport.pull('Cases', null)).rejects.toThrow('Unauthorized');
  });
});
