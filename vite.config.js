import { defineConfig } from 'vite';
import { resolve } from 'path';

// Vite 配置 - Electron 渲染进程构建
export default defineConfig({
  root: './',
  base: './',
  
  build: {
    outDir: 'dist/electron',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/ui/index.html')
      },
      output: {
        // 保持简单的文件名
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    
    // 针对 Electron 环境
    target: 'chrome120',
    minify: 'esbuild',
    sourcemap: false
  },
  
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@encoders': resolve(__dirname, 'src/encoders'),
      '@adapters': resolve(__dirname, 'src/adapters'),
      '@ui': resolve(__dirname, 'src/ui')
    }
  },
  
  // 优化配置
  optimizeDeps: {
    include: ['lamejs']
  }
});