# Cython extensions (optional)

The Django REST API **view layer stays Python** (DRF `APIView`, viewsets, serializers, ORM). Optional **Cython** builds accelerate **pure helper** code used by those views.

## There is no “convert everything and delete all .py” command

Django and DRF **require** `.py` sources at runtime for:

- `manage.py`, `settings`, `urls`, `wsgi` / `asgi`
- **Models**, **migrations**, **admin**, **apps**
- **DRF** views, serializers, permissions, routers
- Celery tasks that import Django

A single command cannot compile the whole API to Cython and remove `.py` files without **breaking the app**. This project only compiles modules listed in **`cython_manifest.json`** (pure helpers). **`social_stats/_cython/*_py.py`** fallbacks stay so dev/CI work without a C compiler.

**Do not delete** `.py` files under `social_stats/` except after a deliberate, module-by-module migration—and never delete models, views, serializers, or migrations.

## Full build + verify (maximum safe automation)

**Windows (PowerShell), from repo:**

```powershell
cd C:\Project2\social-stats-social-media-manager\backend
pip install -r requirements-dev.txt
python scripts/build_cython.py --clean --verify
```

**Linux / macOS / Docker backend container:**

```bash
cd backend
pip install -r requirements-dev.txt
python scripts/build_cython.py --clean --verify
```

Then restart API workers:

```bash
# Docker example
docker restart social-stats-backend-1 social-stats-celery_worker-1 social-stats-celery_beat-1
```

**Docker one-liner (inside running backend container):**

```bash
docker exec social-stats-backend-1 bash -lc "cd /app/backend && pip install -q cython && python scripts/build_cython.py --clean --verify"
```

After success, compiled modules live as `.pyd` (Windows) or `.so` (Linux) under `social_stats/_cython/`. The REST API behavior should match the Python fallback; `--verify` runs helper + inbox tests.

## Why not compile all of DRF?

View classes rely on Django/DRF decorators, ORM querysets, and dynamic dispatch. Compiling them rarely helps and often breaks. Compile **leaf helpers** instead (date parsing, aggregation math, parsing utilities).

## Layout

| Path | Role |
|------|------|
| `backend/cython_manifest.json` | Lists extension module names and `.pyx` sources |
| `backend/setup_cython.py` | setuptools `build_ext` entry |
| `backend/scripts/build_cython.py` | Install check + `build_ext --inplace` + smoke test |
| `social_stats/_cython/*.pyx` | Cython sources |
| `social_stats/_cython/*_py.py` | Identical pure-Python fallback |
| `social_stats/date_utils_fast.py` | Import compiled module or fallback |

Wired into existing API paths:

- `parse_dates()` in `views.py` (inbox, analytics date filters)
- `parse_publish_date_range()` in `publish_list_dates.py` (calendar, post management)

## Build (local or Docker backend container)

```bash
cd backend
pip install -r requirements-dev.txt   # includes Cython
python scripts/build_cython.py
```

Clean rebuild:

```bash
python scripts/build_cython.py --clean --verify
```

Restart **gunicorn** / **celery** after building so workers load the new `.so` / `.pyd`.

## Verify

```bash
python manage.py test social_stats.tests.test_date_utils_fast
```

In Django shell:

```python
from social_stats.date_utils_fast import using_cython
using_cython()  # True after successful build
```

## Add a new extension

1. Add `social_stats/_cython/your_module.pyx` and matching `your_module_py.py` fallback.
2. Register in `cython_manifest.json`.
3. Expose via a thin bridge module (pattern: `date_utils_fast.py`).
4. Keep DRF views importing the bridge, not the `.pyx` directly.

Do **not** import Django ORM inside `.pyx` files.

## CI / dev without Cython

If extensions are not built, imports automatically use the pure-Python fallback — **same API responses**, no extra config.
