import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';

export default function FloatingCreateButton({ onClick, label = 'New post' }) {
  return (
    <button
      type="button"
      className="bb-cal__fab"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}

FloatingCreateButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string,
};
