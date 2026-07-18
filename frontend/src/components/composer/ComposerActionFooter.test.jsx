import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComposerActionFooter from './ComposerActionFooter';

function renderFooter(overrides = {}) {
  const props = {
    saving: false,
    scheduleMode: 'now',
    onSaveDraft: jest.fn(),
    onPreflight: jest.fn(),
    onSchedule: jest.fn(),
    onPublishNow: jest.fn(),
    ...overrides,
  };

  render(<ComposerActionFooter {...props} />);
  return props;
}

describe('ComposerActionFooter', () => {
  test('exposes draft, preflight, and immediate publishing actions', async () => {
    const user = userEvent.setup();
    const props = renderFooter();

    await user.click(screen.getByRole('button', { name: 'Save Draft' }));
    await user.click(screen.getByRole('button', { name: 'Preflight' }));
    await user.click(screen.getByRole('button', { name: 'Publish Now' }));

    expect(props.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(props.onPreflight).toHaveBeenCalledTimes(1);
    expect(props.onPublishNow).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Schedule' })).not.toBeInTheDocument();
  });

  test('offers scheduling instead of immediate publishing in schedule mode', async () => {
    const user = userEvent.setup();
    const props = renderFooter({ scheduleMode: 'schedule' });

    expect(screen.queryByRole('button', { name: 'Publish Now' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Schedule' }));

    expect(props.onSchedule).toHaveBeenCalledTimes(1);
    expect(props.onPublishNow).not.toHaveBeenCalled();
  });

  test('disables all actions while saving', async () => {
    const user = userEvent.setup();
    const props = renderFooter({ saving: true, scheduleMode: 'schedule' });
    const saveDraft = screen.getByRole('button', { name: 'Save Draft' });
    const schedule = screen.getByRole('button', { name: 'Scheduling…' });
    const preflight = screen.getByRole('button', { name: 'Preflight' });

    expect(saveDraft).toBeDisabled();
    expect(schedule).toBeDisabled();
    expect(preflight).toBeDisabled();

    await user.click(saveDraft);
    await user.click(schedule);
    await user.click(preflight);

    expect(props.onSaveDraft).not.toHaveBeenCalled();
    expect(props.onSchedule).not.toHaveBeenCalled();
    expect(props.onPreflight).not.toHaveBeenCalled();
  });
});
