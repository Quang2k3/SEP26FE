// app/login/page.tsx

import React from 'react';
import { Card, Typography } from 'antd'; // Cài đặt Ant Design nếu chưa có trong dự án bằng câu lệnh: npm install antd
import LoginForm from '@/components/auth/LoginForm';  // Giả sử bạn đã có component LoginForm trong thư mục components/auth

const { Title, Text } = Typography;

/**
 * Login Page
 * -------------
 * File này đại diện cho route /login
 * Chỉ chịu trách nhiệm hiển thị layout trang login
 * Không xử lý logic đăng nhập
 */
export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
      }}
    >
      <Card
        style={{
          width: 400,
          borderRadius: 8,
        }}
      >
        {/* Title */}
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          WMS Login
        </Title>

        <Text
          type="secondary"
          style={{
            display: 'block',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Đăng nhập hệ thống quản lý kho
        </Text>

        {/* Form đăng nhập */}
        <LoginForm />
      </Card>
    </div>
  );
}
