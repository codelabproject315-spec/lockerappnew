const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { locker_id, email, isAdmin } = req.body;

  if (!locker_id || !email) {
    return res.status(400).json({ error: 'locker_idとemailが必要です' });
  }

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    // 管理者以外はメール照合
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      const getResult = await client.send(new GetItemCommand({
        TableName: 'Lockers',
        Key: marshall({ locker_id: String(locker_id) }),
      }));

      if (!getResult.Item) {
        return res.status(404).json({ error: 'ロッカーが見つかりません' });
      }

      const locker = unmarshall(getResult.Item);
      if (locker.email !== email) {
        return res.status(403).json({ error: '自分が登録したロッカーのみ取り消せます' });
      }
    }

    const command = new UpdateItemCommand({
      TableName: 'Lockers',
      Key: marshall({ locker_id: String(locker_id) }),
      UpdateExpression: 'SET #st = :s, student_id = :empty, user_name = :empty, email = :empty, last_updated = :t',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({
        ':s': 'available',
        ':empty': '-',
        ':t': timestamp,
      }),
    });

    await client.send(command);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '返却失敗', detail: err.message });
  }
};
