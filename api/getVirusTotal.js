export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, startDate, endDate } = req.body;

  // Validate inputs
  if (!apiKey || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required fields: apiKey, startDate, endDate' });
  }

  try {
    const startDateParam = startDate.replace(/-/g, '');
    const endDateParam = endDate.replace(/-/g, '');

    const response = await fetch(
      `https://www.virustotal.com/api/v3/users/${apiKey}/api_usage?start_date=${startDateParam}&end_date=${endDateParam}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-apikey': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
