const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const command = new ScanCommand({ TableName: 'Lockers' });
    const response = await client.send(command);
    const items = response.Items.map(item => unmarshall(item));

    // 数字順にソート
    items.sort((a, b) => {
      const na = parseInt(a.locker_id) || 99999;
      const nb = parseInt(b.locker_id) || 99999;
      return na - nb;
    });

    const requestEmail = (req.query && req.query.email) ? req.query.email.toLowerCase() : null;

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = requestEmail && ADMIN_EMAILS.includes(requestEmail);

    // emailは「本人のロッカー」または「管理者からの要求」の場合のみ返す（他人のメールアドレスを隠す）
    const safeItems = items.map(item => {
      const { email, ...rest } = item;
      if (isAdmin || (requestEmail && email && email.toLowerCase() === requestEmail)) {
        return { ...rest, email };
      }
      return rest;
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(safeItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DynamoDB接続エラー', detail: err.message });
  }
};
