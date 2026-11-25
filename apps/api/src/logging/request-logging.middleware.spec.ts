import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestLoggingMiddleware } from './request-logging.middleware';

function fakeRequest(headers: Record<string, string> = {}, url = '/tasks'): Request {
  return { method: 'GET', originalUrl: url, headers } as unknown as Request;
}

function fakeResponse(statusCode = 200): Response & EventEmitter {
  const res = new EventEmitter() as Response & EventEmitter;
  res.statusCode = statusCode;
  res.setHeader = jest.fn();
  return res;
}

describe('RequestLoggingMiddleware', () => {
  const middleware = new RequestLoggingMiddleware();
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('calls next and logs nothing until the response finishes', () => {
    const next = jest.fn();

    middleware.use(fakeRequest(), fakeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });

  it('logs method, path without query, status, duration and request id', () => {
    const res = fakeResponse(200);

    middleware.use(fakeRequest({}, '/tasks?secret=1'), res, jest.fn());
    res.emit('finish');

    expect(log).toHaveBeenCalledWith({
      method: 'GET',
      path: '/tasks',
      statusCode: 200,
      durationMs: expect.any(Number),
      requestId: expect.any(String),
    });
  });

  it('reuses a valid incoming request id and echoes it', () => {
    const res = fakeResponse();

    middleware.use(fakeRequest({ 'x-request-id': 'abc-123' }), res, jest.fn());

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
  });

  it.each(['has spaces', 'x'.repeat(65), 'bad\nline'])('replaces invalid id %j', (bad) => {
    const res = fakeResponse();

    middleware.use(fakeRequest({ 'x-request-id': bad }), res, jest.fn());

    const [, sentId] = (res.setHeader as jest.Mock).mock.calls[0];
    expect(sentId).not.toBe(bad);
    expect(sentId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('logs 4xx as warnings and 5xx as errors', () => {
    const clientError = fakeResponse(400);
    const serverError = fakeResponse(500);

    middleware.use(fakeRequest(), clientError, jest.fn());
    middleware.use(fakeRequest(), serverError, jest.fn());
    clientError.emit('finish');
    serverError.emit('finish');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
