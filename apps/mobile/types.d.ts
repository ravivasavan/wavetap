// CSS module + global CSS type declarations for the web (react-native-web) target.
// Expo writes equivalent declarations into the git-ignored `expo-env.d.ts` on
// `expo start`; this committed copy keeps `tsc --noEmit` green standalone (CI)
// before the dev server has run.
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.css";
