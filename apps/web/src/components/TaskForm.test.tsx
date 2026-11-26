import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/client';
import { TaskForm } from './TaskForm';

function setup(onCreate = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup();
  render(<TaskForm onCreate={onCreate} />);
  const title = screen.getByLabelText('Title');
  const description = screen.getByLabelText('Description (optional)');
  const submit = screen.getByRole('button', { name: 'Add task' });
  return { user, onCreate, title, description, submit };
}

describe('TaskForm', () => {
  describe('validation in the browser', () => {
    it('asks for a title and does not call the API when it is empty', async () => {
      const { user, onCreate, title, submit } = setup();

      await user.click(submit);

      expect(screen.getByRole('alert')).toHaveTextContent('Title is required.');
      expect(title).toHaveAttribute('aria-invalid', 'true');
      expect(title).toHaveAccessibleDescription('Title is required.');
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('treats a title of only spaces as empty', async () => {
      const { user, onCreate, title, submit } = setup();

      await user.type(title, '    ');
      await user.click(submit);

      expect(screen.getByRole('alert')).toHaveTextContent('Title is required.');
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('rejects a title over 200 characters', async () => {
      const { user, onCreate, title, submit } = setup();

      await user.click(title);
      await user.paste('a'.repeat(201));
      await user.click(submit);

      expect(screen.getByRole('alert')).toHaveTextContent('200 characters');
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('rejects a description over 2000 characters', async () => {
      const { user, onCreate, title, description, submit } = setup();

      await user.type(title, 'ok');
      await user.click(description);
      await user.paste('a'.repeat(2001));
      await user.click(submit);

      expect(screen.getByRole('alert')).toHaveTextContent('2000 characters');
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('clears the error of a field as soon as it is edited', async () => {
      const { user, title, submit } = setup();
      await user.click(submit);

      await user.type(title, 'x');

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(title).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('submitting', () => {
    it('sends the trimmed title, leaves out a blank description and clears the form', async () => {
      const { user, onCreate, title, description, submit } = setup();

      await user.type(title, '  Buy milk ');
      await user.type(description, '   ');
      await user.click(submit);

      expect(onCreate).toHaveBeenCalledWith({ title: 'Buy milk' });
      expect(title).toHaveValue('');
      expect(description).toHaveValue('');
    });

    it('sends the description when there is one', async () => {
      const { user, onCreate, title, description, submit } = setup();

      await user.type(title, 'Buy milk');
      await user.type(description, '2 litres');
      await user.click(submit);

      expect(onCreate).toHaveBeenCalledWith({ title: 'Buy milk', description: '2 litres' });
    });

    it('disables the button while sending and ignores a second Enter key press', async () => {
      let finish: () => void = () => {};
      const onCreate = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
      const { user, title, submit } = setup(onCreate);

      await user.type(title, 'Buy milk{Enter}');
      expect(submit).toBeDisabled();
      expect(submit).toHaveTextContent('Adding…');
      await user.type(title, '{Enter}');
      expect(onCreate).toHaveBeenCalledTimes(1);

      finish();
      await screen.findByRole('button', { name: 'Add task' });
      expect(screen.getByRole('button', { name: 'Add task' })).toBeEnabled();
    });
  });

  describe('server errors', () => {
    it('shows the error, keeps the typed text and lets the person try again', async () => {
      const onCreate = vi.fn().mockRejectedValue(new ApiError('title should not be empty', 400));
      const { user, title, description, submit } = setup(onCreate);

      await user.type(title, 'Buy milk');
      await user.type(description, '2 litres');
      await user.click(submit);

      expect(await screen.findByRole('alert')).toHaveTextContent('title should not be empty');
      expect(title).toHaveValue('Buy milk');
      expect(description).toHaveValue('2 litres');
      expect(submit).toBeEnabled();
    });

    it('shows the rate limit message', async () => {
      const message = 'Too many requests. Please try again in a minute.';
      const onCreate = vi.fn().mockRejectedValue(new ApiError(message, 429));
      const { user, title, submit } = setup(onCreate);

      await user.type(title, 'Buy milk');
      await user.click(submit);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    });

    it('uses a generic message for an unexpected error', async () => {
      const onCreate = vi.fn().mockRejectedValue(new Error('boom'));
      const { user, title, submit } = setup(onCreate);

      await user.type(title, 'Buy milk');
      await user.click(submit);

      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    });

    it('clears the server error when the person submits again', async () => {
      const onCreate = vi
        .fn()
        .mockRejectedValueOnce(new ApiError('down'))
        .mockResolvedValueOnce(undefined);
      const { user, title, submit } = setup(onCreate);
      await user.type(title, 'Buy milk');
      await user.click(submit);
      await screen.findByRole('alert');

      await user.click(submit);

      expect(await screen.findByRole('button', { name: 'Add task' })).toBeEnabled();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
