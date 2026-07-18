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
    content: '',
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

  test('renders selected platform tabs and reports a tab selection', async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();
    const facebook = screen.getByRole('tab', { name: 'Facebook' });
    const instagram = screen.getByRole('tab', { name: 'Instagram' });

    expect(facebook).toHaveAttribute('aria-selected', 'true');
    expect(instagram).toHaveAttribute('aria-selected', 'false');

    await user.click(instagram);

    expect(props.onSelectPreview).toHaveBeenCalledWith('instagram');
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
    expect(readComposerPreviewExpanded()).toBe(false);
  });
});
