module.exports = function health(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    ok: true,
    runtime: 'vercel',
    timestamp: new Date().toISOString()
  });
};
