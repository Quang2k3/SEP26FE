'use client';

import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
      }}
    >
      <Card style={{ width: 380 }}>
        <Title level={3}>Forgot Password</Title>
        <Text type="secondary">
          This feature will be implemented later.
        </Text>
      </Card>
    </div>
  );
}
