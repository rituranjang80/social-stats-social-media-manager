import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComposerTags from './ComposerTags';
import { composerAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  composerAPI: {
    posts: {
      tagSuggestions: jest.fn(),
    },
  },
}));

describe('ComposerTags', () => {
  beforeEach(() => {
    composerAPI.posts.tagSuggestions.mockResolvedValue({
      data: { tags: ['Campaign', 'Evergreen'] },
    });
  });

  test('adds a selected suggestion to the current tags', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ComposerTags value={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Select tags/i }));
    await user.click(await screen.findByRole('option', { name: 'Campaign' }));

    expect(onChange).toHaveBeenCalledWith(['Campaign']);
  });

  test('removes a selected tag through its named remove action', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <ComposerTags
        value={['Campaign', 'Evergreen']}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove tag Campaign' }));

    expect(onChange).toHaveBeenCalledWith(['Evergreen']);
  });
});
