import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../validation';
import { CreateTaskDto } from './create-task.dto';

const metadata: ArgumentMetadata = { type: 'body', metatype: CreateTaskDto };

describe('CreateTaskDto with the validation pipe', () => {
  const pipe = createValidationPipe();

  it('trims title and description', async () => {
    const dto = await pipe.transform({ title: '  Buy milk ', description: ' 2 litres ' }, metadata);

    expect(dto).toEqual({ title: 'Buy milk', description: '2 litres' });
  });

  it('accepts a title without a description', async () => {
    await expect(pipe.transform({ title: 'Buy milk' }, metadata)).resolves.toEqual({
      title: 'Buy milk',
    });
  });

  it.each([
    ['a missing title', {}],
    ['an empty title', { title: '' }],
    ['a whitespace-only title', { title: '   ' }],
    ['a non-string title', { title: 42 }],
    ['a title over 200 characters', { title: 'a'.repeat(201) }],
    ['a description over 2000 characters', { title: 'ok', description: 'a'.repeat(2001) }],
    ['a null description', { title: 'ok', description: null }],
    ['an unknown field', { title: 'ok', foo: 'bar' }],
    ['a client-chosen id', { title: 'ok', id: 'x' }],
    ['a client-chosen status', { title: 'ok', status: 'done' }],
  ])('rejects %s', async (_name, body) => {
    await expect(pipe.transform(body, metadata)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('drops a description that is only spaces', async () => {
    await expect(pipe.transform({ title: 'ok', description: '   ' }, metadata)).resolves.toEqual({
      title: 'ok',
    });
  });

  it('accepts a title of exactly 200 characters', async () => {
    const title = 'a'.repeat(200);

    await expect(pipe.transform({ title }, metadata)).resolves.toEqual({ title });
  });
});
