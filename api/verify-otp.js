const { DynamoDBClient, GetItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
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

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'メールアドレスとコードが必要です' });
  }

  try {
    // DynamoDBからOTPを取得
    const result = await client.send(new GetItemCommand({
      TableName: 'OtpCodes',
      Key: marshall({ email }),
    }));

    if (!result.Item) {
      return res.status(400).json({ error: 'コードが見つかりません。再送信してください。' });
    }

    const item = unmarshall(result.Item);
    const now = Math.floor(Date.now() / 1000);

    // 有効期限チェック
    if (now > item.expires_at) {
      await client.send(new DeleteItemCommand({
        TableName: 'OtpCodes',
        Key: marshall({ email }),
      }));
      return res.status(400).json({ error: 'コードの有効期限が切れています。再送信してください。' });
    }

    // OTP照合
    if (item.otp !== otp.trim()) {
      return res.status(400).json({ error: 'コードが正しくありません。' });
    }

    // 認証成功 → OTP削除
    await client.send(new DeleteItemCommand({
      TableName: 'OtpCodes',
      Key: marshall({ email }),
    }));

    res.status(200).json({ success: true, email });
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ error: '認証処理失敗' });
  }
};
