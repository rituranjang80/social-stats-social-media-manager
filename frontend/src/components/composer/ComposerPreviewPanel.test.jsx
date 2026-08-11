import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComposerPreviewPanel, {
  COMPOSER_PREVIEW_STORAGE_KEY,
  readComposerPreviewExpanded,
} from './ComposerPreviewPanel';

function renderPanel(overrides = {}) {
  const props = {
    open: false,
    onClose: jest.fn(),
    desktopExpanded: true,
    onDesktopExpandedChange: jest.fn(),
    platforms: ['facebook', 'instagram'],
    activePreview: 'facebook',
    onSelectPreview: jest.fn(),
    content: 'Hello world',
    mediaAssets: [],
    mediaType: 'text',
    user: null,
    firstComment: '',
    ...overrides,
  };

  return { ...render(<ComposerPreviewPanel {...props} />), props };
}

describe('ComposerPreviewPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('default channel is expanded and shows preview content below', () => {
    renderPanel();

    const facebook = screen.getByRole('button', { name: /Facebook/i });
    expect(facebook).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  test('clicking channel header toggles expand/collapse', async () => {
    const user = userEvent.setup();
    renderPanel();

    const facebook = screen.getByRole('button', { name: /Facebook/i });
    await user.click(facebook);
    expect(facebook).toHaveAttribute('aria-expanded', 'false');

    await user.click(facebook);
    expect(facebook).toHaveAttribute('aria-expanded', 'true');
  });

  test('double-clicking preview panel opens floating popup', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.dblClick(document.getElementById('composer-preview'));

    expect(screen.getByRole('dialog', { name: 'Floating live preview' })).toBeInTheDocument();
    expect(screen.getAllByText('Hello world').length).toBeGreaterThanOrEqual(1);
  });

  test('requests expansion changes and persists the rendered expansion state', async () => {
    const user = userEvent.setup();
    const { props, rerender } = renderPanel({ desktopExpanded: true });

    expect(readComposerPreviewExpanded()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Collapse preview panel' }));
    expect(props.onDesktopExpandedChange).toHaveBeenCalledWith(false);

    rerender(<ComposerPreviewPanel {...props} desktopExpanded={false} />);

    expect(screen.getByRole('button', { name: 'Expand preview panel' }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem(COMPOSER_PREVIEW_STORAGE_KEY)).toBe('0');
  });

  test('does not render channel sections when no channels are selected', () => {
    renderPanel({ platforms: [], activePreview: '' });

    expect(screen.queryByRole('button', { name: /Facebook/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Select a channel');
  });
});
