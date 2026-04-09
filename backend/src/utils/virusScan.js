/**
 * Virus scanning stub.
 *
 * Replace `scanBuffer` with a real AV integration such as ClamAV (via
 * node-clam), VirusTotal API, or a cloud AV service before deploying to
 * production.  The stub always reports the file as clean so the rest of the
 * upload pipeline works without an AV service configured.
 *
 * Expected return shape: { clean: boolean, reason?: string }
 */
async function scanBuffer(buffer, filename) {
  // TODO: integrate a real antivirus engine here.
  // Example using node-clam:
  //   const NodeClam = require('clamscan');
  //   const clamscan = await new NodeClam().init({ clamdscan: { active: true } });
  //   const { isInfected, viruses } = await clamscan.scanBuffer(buffer);
  //   return { clean: !isInfected, reason: viruses.join(', ') };
  return { clean: true };
}

module.exports = { scanBuffer };
