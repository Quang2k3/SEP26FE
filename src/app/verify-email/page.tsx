'use client';

import { Card, Typography, Form, Input, Button } from 'antd';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function VerifyEmailPage() {
  const router = useRouter();

  const onFinish = (values: any) => {
    // TODO: gọi API verify OTP ở bước sau
    console.log('OTP:', values.otp);

    // Tạm thời cho đi tiếp để demo flow
    router.push('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card style={{ width: 380 }}>
        <Title level={3} style={{ textAlign: 'center' }}>
          Verify Your Email
        </Title>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
          Enter the 6-digit code sent to your email
        </Text>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Verification Code"
            name="otp"
            rules={[
              { required: true, message: 'Verification code is required' },
              { len: 6, message: 'OTP must be exactly 6 digits' },
            ]}
          >
            <Input
              maxLength={6}
              placeholder="Enter OTP"
              style={{ textAlign: 'center', letterSpacing: 4 }}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            Verify Email
          </Button>

          <Button type="link" block style={{ marginTop: 8 }}>
            Resend code
          </Button>
        </Form>
      </Card>
    </div>
  );
}
