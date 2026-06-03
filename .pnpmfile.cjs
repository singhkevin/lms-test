/**
 * pnpm hook to strip esbuild's postinstall script.
 * 
 * On Hostinger's shared hosting, esbuild's binary doesn't have execute
 * permission (EACCES). The postinstall tries to validate the binary by
 * running `esbuild --version`, which fails. Stripping the postinstall
 * lets `pnpm install` succeed — the platform-specific binary package
 * (@esbuild/linux-x64) is still installed as a regular dependency.
 * 
 * We fix permissions with chmod in the build command instead.
 */
function readPackage(pkg) {
  if (pkg.name === 'esbuild' && pkg.scripts && pkg.scripts.postinstall) {
    delete pkg.scripts.postinstall;
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
