export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).json({
    buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? new Date().toISOString(),
  });
}
