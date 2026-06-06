# Split e2e CI into matrix shards

## Problem

The `e2e` job in `.github/workflows/pull_request.yaml` runs ~30 min per Node version. Step-level timings of run 26978634481 show the bottleneck:

| Step | 24.x | 22.x |
|---|---|---|
| Install / setup | ~50s | ~50s |
| **Image tests (8 in `&` parallel)** | **22m 20s** | **19m 48s** |
| Movie batch 1 (3 parallel) | 36s | 38s |
| Movie batch 2 (3 parallel) | 1m 3s | 1m 6s |
| Animated movies (2 parallel) | 3m 57s | 3m 36s |
| Movie vision | 6s | 6s |
| PDF batch 1/2/no_audio | ~43s | ~40s |
| Other / tool complete | ~18s | ~17s |
| Upload artifact | 8s | 8s |
| **Total** | **~30m** | **~27m** |

Eight `cli images` calls share one VM via `&` + `wait`, so CPU contention dominates the wall‑clock. Splitting them across runners removes the contention and parallelises the long tail.

## Plan

Replace the single `e2e` job with a sharded matrix. Each shard does the full pipeline for its own script(s) on its own runner.

### Shard layout (16 shards)

Image‑only (each ~3–10 min standalone, was ~22 min combined):

1. `img-order` — `cli images test_order.json`
2. `img-beats` — `cli images test_beats.json`
3. `img-render-stress` — `cli images test_render_stress.json`
4. `img-html-animation` — `cli images test_html_animation.json`
5. `img-cover-landscape` — `cli images test_html_cover_pan_zoom_landscape_canvas.json`
6. `img-cover-portrait` — `cli images test_html_cover_pan_zoom_portrait_canvas.json`

Image + movie (movie auto‑generates images, so a single command):

7. `anim-canvas` — `cli movie test_animated.json`
8. `anim-data` — `cli movie test_data_animation.json`

Movie‑only (no_audio gets its companion pdf/bundle/markdown/html in the same shard):

9. `movie-no-audio` — `cli movie test_no_audio.json && cli pdf test_no_audio.json && cli bundle test_no_audio.json && cli markdown test_no_audio.json && cli html test_no_audio.json`
10. `movie-credit` — `cli movie test_no_audio_with_credit.json`
11. `movie-transition` — `cli movie test_transition_no_audio.json`
12. `movie-slideout` — `cli movie test_slideout_left_no_audio.json`
13. `movie-hello` — `cli movie test_hello_caption.json && cli movie test_hello_image.json`
14. `movie-vision` — `cli movie test_vision.json`

PDF / tool:

15. `pdf-order` — six `cli pdf test_order.json` and `test_order_portrait.json` variants (slide / talk / handout × landscape / portrait)
16. `tool-complete` — three `tool complete minimum_beats.json` variants

### Matrix

Keep `node-version: [22.x, 24.x]` (matches current behaviour). 16 shards × 2 versions = 32 jobs.

### Artifact upload

Each shard uploads its own `output/` to `generatedmedia-<node>-<shard>`. Same content as before, just sharded by shard name.

### Trade‑off (mentioned in PR)

- Compute time: ~30 min × 2 → ~10 min × 32 ≈ 5× more CI minutes.
- Wall‑clock: ~30 min → ~10 min target (cold‑start ~1 min + slowest single shard).

## Files affected

- `.github/workflows/pull_request.yaml` — replace the `e2e` job.

## Verification

- Open PR, watch the e2e matrix run, confirm all 32 shards pass and the longest is materially below 30 min.
- Artifacts: confirm the per‑shard `generatedmedia-*` are produced.
