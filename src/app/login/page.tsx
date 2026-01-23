'use client';

import { Card, Typography } from 'antd';
import LoginForm from '@/components/auth/LoginForm';

const { Title } = Typography;

export default function LoginPage() {
  return (
    <Card style={{ width: 360 }}>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
        WMS Login
      </Title>

      <LoginForm />
    </Card>
  );
}
