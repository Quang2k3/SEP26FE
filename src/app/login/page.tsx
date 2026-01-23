'use client';

import { Card, Typography } from 'antd';
import LoginForm from '@/components/auth/LoginForm';

const { Title } = Typography;

export default function LoginPage() {
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
      <Card style={{ width: 360 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          Login / Đăng nhập
        </Title>

        <LoginForm />
      </Card>
    </div>
  );
}
