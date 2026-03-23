const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const nodemailer = require('nodemailer');

const client = new DynamoDBClient({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // Googleアプリパスワード（16桁）
  },
});

const ALLOWED_DOMAIN = '@sit.ac.jp';
const OTP_EXPIRE_SECONDS = 300; // 5分

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !email.endsWith(ALLOWED_DOMAIN)) {
    return res.status(400).json({ error: `${ALLOWED_DOMAIN} のメールアドレスのみ使用できます` });
  }

  const otp = generateOTP();
  const expiresAt = Math.floor(Date.now() / 1000) + OTP_EXPIRE_SECONDS;

  // OTPをDynamoDBに保存（OtpCodesテーブル）
  try {
    await client.send(new PutItemCommand({
      TableName: 'OtpCodes',
      Item: marshall({
        email,
        otp,
        expires_at: expiresAt,
      }),
    }));
  } catch (err) {
    console.error('DynamoDB error:', err);
    return res.status(500).json({ error: 'OTP保存失敗' });
  }

  // GmailでOTPメール送信
  try {
    await transporter.sendMail({
      from: `"ロッカー管理システム" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '【ロッカー管理システム】認証コード',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1565c0;">認証コード</h2>
          <p>以下のコードを入力してください。有効期限は<strong>5分</strong>です。</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1565c0; background: #f0f4ff; padding: 20px; text-align: center; border-radius: 8px; margin: 24px 0;">
            ${otp}
          </div>
          <p style="color: #888; font-size: 12px;">このメールに心当たりがない場合は無視してください。</p>
        </div>
      `,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Gmail send error:', err);
    res.status(500).json({ error: 'メール送信失敗', detail: err.message });
  }
};
