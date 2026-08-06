const { DynamoDBClient, UpdateItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
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

  const { locker_id, email } = req.body;
  // student_id / user_name は個人情報のため保持しない。任意で管理者が付与した場合のみ利用。
  const student_id = req.body.student_id || '-';
  const user_name = req.body.user_name || '-';

  if (!locker_id || !email) {
    return res.status(400).json({ error: 'ロッカー番号とメールアドレスが必要です' });
  }

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    // 1メールアドレスにつき1台まで：既に使用中のロッカーがないか確認
    const scanResult = await client.send(new ScanCommand({
      TableName: 'Lockers',
      FilterExpression: '#st = :inuse',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({ ':inuse': 'in_use' }),
    }));
    const inUseItems = (scanResult.Items || []).map(unmarshall);
    const existing = inUseItems.find(i =>
      i.email && String(i.email).toLowerCase() === String(email).toLowerCase() && String(i.locker_id) !== String(locker_id)
    );
    if (existing) {
      return res.status(409).json({
        error: `既にロッカー ${existing.locker_id} を利用中です。1つのメールアドレスにつき1台までしか借りられません。`,
      });
    }

    const command = new UpdateItemCommand({
      TableName: 'Lockers',
      Key: marshall({ locker_id: String(locker_id) }),
      UpdateExpression: 'SET #st = :s, student_id = :sid, user_name = :u, email = :e, last_updated = :t',
      ConditionExpression: 'attribute_not_exists(#st) OR #st = :avail',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: marshall({
        ':s': 'in_use',
        ':avail': 'available',
        ':sid': student_id,
        ':u': user_name,
        ':e': email,
        ':t': timestamp,
      }),
    });

    await client.send(command);
    res.status(200).json({ success: true });
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({ error: 'このロッカーは他の人が使用中です。別のロッカーを選んでください。' });
    }
    console.error(err);
    res.status(500).json({ error: '更新失敗', detail: err.message });
  }
};
