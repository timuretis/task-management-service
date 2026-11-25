import { ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown): { status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status, json };
}

describe('AllExceptionsFilter', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps the body of a Nest HttpException and does not log it', () => {
    const { status, json } = run(new BadRequestException(['title should not be empty']));

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: ['title should not be empty'],
      error: 'Bad Request',
      statusCode: 400,
    });
    expect(error).not.toHaveBeenCalled();
  });

  it('wraps a string HttpException response in the standard body', () => {
    const { json } = run(new NotFoundException('nothing here'));

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('wraps an HttpException with a plain string response', () => {
    const exception = new BadRequestException();
    jest.spyOn(exception, 'getResponse').mockReturnValue('plain text');

    const { json } = run(exception);

    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'plain text',
      error: 'Bad Request',
    });
  });

  it('maps a body-parser style error to its 4xx status', () => {
    const { status, json } = run({ status: 413, message: 'request entity too large' });

    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith({
      statusCode: 413,
      message: 'request entity too large',
      error: 'Payload Too Large',
    });
  });

  it('hides the details of an unexpected error and logs its stack', () => {
    const { status, json } = run(new Error('relation "tasks" does not exist'));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    expect(error).toHaveBeenCalledWith('Unhandled exception', expect.stringContaining('relation'));
  });

  it('handles a thrown value that is not an Error', () => {
    const { status } = run('boom');

    expect(status).toHaveBeenCalledWith(500);
    expect(error).toHaveBeenCalledWith('Unhandled exception', 'boom');
  });

  it('treats null as an unexpected error', () => {
    expect(run(null).status).toHaveBeenCalledWith(500);
  });
});
