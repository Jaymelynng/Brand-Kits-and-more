

## Fix Build Error: Externalize `onnxruntime-web`

### Problem
The build fails because `onnxruntime-web` (a dependency of `@imgly/background-removal`) cannot be resolved at build time. Only `onnxruntime-web/webgpu` is currently externalized, but the base `onnxruntime-web` import also needs to be excluded.

### Solution
Update `vite.config.ts` to add `"onnxruntime-web"` to the `build.rollupOptions.external` array alongside the existing `"onnxruntime-web/webgpu"` entry.

### Technical Details

**File: `vite.config.ts`**
- Change `external: ["onnxruntime-web/webgpu"]` to `external: ["onnxruntime-web", "onnxruntime-web/webgpu"]`

This is a one-line change. No other files are affected.

