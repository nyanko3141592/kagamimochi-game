import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    publicDir: 'public', // default, but we moved assets to mochi-stack/public, so root's public is empty
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                mochi: resolve(__dirname, 'mochi-stack/index.html'),
                daruma: resolve(__dirname, 'daruma-game/index.html')
            }
        }
    }
});
