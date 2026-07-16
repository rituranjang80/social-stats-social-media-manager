/* ============================================================================
 * Media Library — reusable photos, videos, and graphics.
 * Double-click a video to open it in Video Studio.
 * ========================================================================== */
import { useLocation, useNavigate } from 'react-router-dom';

import PageHeader from '../../components/layout/PageHeader';
import { MediaLibraryBody } from '../../components/media';

import '../../styles/scss/media-library.scss';

export default function MediaLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const videoStudioPath = `${basePath}/analytics/video`;

  return (
    <div className="media-library">
      <PageHeader
        title="Media Library"
        subtitle="Reusable photos, videos, and graphics — double-click a video to edit in Video Studio"
      />
      <MediaLibraryBody
        mode="manage"
        showUpload
        onOpenVideo={(asset) => {
          if (!(asset?.mime_type || '').startsWith('video/')) return;
          navigate(`${videoStudioPath}?asset_id=${encodeURIComponent(asset.id)}`);
        }}
      />
    </div>
  );
}
