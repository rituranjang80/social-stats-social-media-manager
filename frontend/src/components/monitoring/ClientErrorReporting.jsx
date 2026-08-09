/* ============================================================================
 *  Mount once — global window error handlers → ErrorLog API
 * ========================================================================== */
import { useEffect } from 'react';
import { installGlobalClientErrorHandlers } from '../../services/clientErrorReporter';

export default function ClientErrorReporting() {
  useEffect(() => installGlobalClientErrorHandlers(), []);
  return null;
}
