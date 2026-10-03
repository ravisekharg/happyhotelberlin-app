export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const form = req.query.form;
  if (!['booking', 'contact'].includes(form)) {
    return res.status(404).json({ ok: false, error: 'Unknown form' });
  }

  let fields;
  try {
    fields = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid data' });
  }

  if (fields?.website) {
    return res.status(200).json({ ok: true, ref: 'HHB-0000' });
  }

  if (!fields?.email || !fields?.name) {
    return res.status(422).json({ ok: false, error: 'Name and email are required' });
  }

  const ref = 'HHB-' + Math.random().toString(16).slice(2, 8).toUpperCase();
  return res.status(200).json({ ok: true, ref });
}
