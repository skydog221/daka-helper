import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Vite 配置 - Web 单文件构建
export default defineConfig({
  root: './',
  base: './',
  
  plugins: [
    viteSingleFile({
      // 移除外部资源引用
      removeViteModuleLoader: true,
      // 内联所有资源
      inlinePattern: ['**/*']
    })
  ],
  
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/ui/index.html')
      },
      output: {
        // 单文件输出，所有内容都会被内联
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // 禁用代码分割以确保单文件输出
        manualChunks: undefined
      }
    },
    
    // 针对现代浏览器
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    
    // CSS 处理
    cssCodeSplit: false,
    
    // 资源处理
    assetsInlineLimit: 100000000 // 100MB，确保所有资源都内联
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