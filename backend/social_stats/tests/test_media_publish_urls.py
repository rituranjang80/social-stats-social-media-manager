# ============================================================================
#  Media URL resolution for composer publish
# ============================================================================
import os
from pathlib import Path

from django.test import TestCase, override_settings

from social_stats import media_service


@override_settings(
    MEDIA_URL='/media/',
    MEDIA_ROOT='/data/media',
    BACKEND_PUBLIC_URL='http://api.example.com',
    DEBUG=False,
)
class MediaPublishUrlTests(TestCase):
    def test_absolute_media_url_adds_scheme(self):
        self.assertEqual(
            media_service.absolute_media_url('/media/media_assets/x.mp4'),
            'http://api.example.com/media/media_assets/x.mp4',
        )
        self.assertEqual(
            media_service.absolute_media_url('https://cdn/x.mp4'),
            'https://cdn/x.mp4',
        )

    def test_resolve_local_media_path(self):
        with self.settings(MEDIA_ROOT=str(Path(__file__).parent)):
            sample = Path(__file__)
            rel = sample.relative_to(Path(__file__).parent).as_posix()
            url = f'/media/{rel}'
            found = media_service.resolve_local_media_path(url)
            self.assertEqual(found, sample)

    def test_ensure_browser_media_url_adds_port(self):
        prev = os.environ.get('GATEWAY_HTTP_PORT')
        os.environ['GATEWAY_HTTP_PORT'] = '8000'
        try:
            fixed = media_service.ensure_browser_media_url(
                'http://localhost/media/media_assets/x.mp4',
            )
            self.assertEqual(fixed, 'http://localhost:8000/media/media_assets/x.mp4')
        finally:
            if prev is None:
                os.environ.pop('GATEWAY_HTTP_PORT', None)
            else:
                os.environ['GATEWAY_HTTP_PORT'] = prev

    @override_settings(MEDIA_ROOT='/data/media', BACKEND_PUBLIC_URL='http://api.example.com')
    def test_youtube_prefers_local_path_when_file_exists(self, tmp_path):
        media_root = tmp_path / 'media'
        media_root.mkdir()
        video = media_root / 'media_assets' / 'clip.mp4'
        video.parent.mkdir(parents=True)
        video.write_bytes(b'fake')

        with self.settings(MEDIA_ROOT=str(media_root)):
            out = media_service.resolve_media_url_for_publish(
                '/media/media_assets/clip.mp4',
                client_id=1,
                platform='youtube',
            )
            self.assertEqual(out, str(video))

            out_ig = media_service.resolve_media_url_for_publish(
                '/media/media_assets/clip.mp4',
                client_id=1,
                platform='instagram',
            )
            self.assertEqual(out_ig, 'http://api.example.com/media/media_assets/clip.mp4')
