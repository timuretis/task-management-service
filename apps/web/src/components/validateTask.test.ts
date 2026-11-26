import { buildNewTask, DESCRIPTION_MAX, TITLE_MAX, validateTask } from './validateTask';

describe('validateTask', () => {
  it('accepts a title alone', () => {
    expect(validateTask('Buy milk', '')).toEqual({});
  });

  it.each(['', '   ', '\n\t'])('rejects an empty title: %j', (title) => {
    expect(validateTask(title, '').title).toBe('Title is required.');
  });

  it('accepts a title of exactly 200 characters and rejects 201', () => {
    expect(validateTask('a'.repeat(TITLE_MAX), '')).toEqual({});
    expect(validateTask('a'.repeat(TITLE_MAX + 1), '').title).toContain('200');
  });

  it('does not count surrounding spaces against the limit', () => {
    expect(validateTask(` ${'a'.repeat(TITLE_MAX)} `, '')).toEqual({});
  });

  it('accepts a description of exactly 2000 characters and rejects 2001', () => {
    expect(validateTask('ok', 'a'.repeat(DESCRIPTION_MAX))).toEqual({});
    expect(validateTask('ok', 'a'.repeat(DESCRIPTION_MAX + 1)).description).toContain('2000');
  });

  it('reports both problems at once', () => {
    const errors = validateTask('', 'a'.repeat(DESCRIPTION_MAX + 1));

    expect(Object.keys(errors)).toEqual(['title', 'description']);
  });
});

describe('buildNewTask', () => {
  it('trims the text', () => {
    expect(buildNewTask('  Buy milk ', ' 2 litres ')).toEqual({
      title: 'Buy milk',
      description: '2 litres',
    });
  });

  it('leaves the description out when it is blank', () => {
    expect(buildNewTask('Buy milk', '   ')).toEqual({ title: 'Buy milk' });
  });
});
