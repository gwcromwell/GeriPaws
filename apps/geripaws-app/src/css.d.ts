// Expo's web build supports importing a global stylesheet directly (see
// constants/theme.ts's `import '@/global.css'`) — Metro handles it at bundle
// time, but plain `tsc` has no built-in notion of a CSS module and otherwise
// fails with "Cannot find module or type declarations for side-effect import".
declare module "*.css";
