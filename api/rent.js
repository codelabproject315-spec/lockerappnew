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

  const { locker_id, student_id, user_name } = req.body;

  if (!locker_id || !student_id || !user_name) {
    return res.status(400).json({ error: '必須項目が不足しています' });
  }

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    const command = new UpdateItemCommand({
      TableName: 'Lockers',
      Key: marshall({ locker_id: String(locker_id) }),
      UpdateExpression: 'SET #st = :s, student_id = :sid, user_name = :u, last_updated = :t',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({
        ':s': 'in_use',
        ':sid': student_id,
        ':u': user_name,
        ':t': timestamp,
      }),
    });

    await client.send(command);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新失敗', detail: err.message });
  }
};
