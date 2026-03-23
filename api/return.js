const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

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

  const { locker_id } = req.body;

  if (!locker_id) {
    return res.status(400).json({ error: 'locker_idが必要です' });
  }

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    const command = new UpdateItemCommand({
      TableName: 'Lockers',
      Key: marshall({ locker_id: String(locker_id) }),
      UpdateExpression: 'SET #st = :s, student_id = :empty, user_name = :empty, last_updated = :t',
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
