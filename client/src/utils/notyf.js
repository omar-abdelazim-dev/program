import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

// Global Notyf instance with unified configuration
const notyf = new Notyf({
  duration: 4000,
  position: { x: 'right', y: 'bottom' },
  dismissible: true,
  ripple: false, // We disable the ripple to allow our custom CSS glass background to show
  types: [
    {
      type: 'success',
      background: 'rgba(16, 185, 129, 0.95)',
      icon: false // We can rely on default or disable
    },
    {
      type: 'error',
      background: 'rgba(239, 68, 68, 0.95)',
      icon: false
    },
    {
      type: 'info',
      background: 'rgba(245, 158, 11, 0.95)', // Matches the theme's orange/yellow
      icon: false
    }
  ]
});

export default notyf;
