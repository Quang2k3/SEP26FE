'use client';

import { Form, Input, Button, Checkbox } from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {

  // Lấy hàm login từ AuthContext
  const { login } = useAuth();

  // State cho Remember me (hiện tại chỉ phục vụ UI)
  const [rememberMe, setRememberMe] = useState(false);

  /**
   * Xử lý submit form login
   * Hiện tại đang mock user để test luồng đăng nhập
   */
  const onFinish = (values: any) => {
    login({
      id: '1', // mock user id (string)
      username: values.username,
      role: 'ADMIN',
    });

    // TODO: nếu cần, lưu rememberMe vào localStorage ở bước sau
  };

  return (
    <Form layout="vertical" onFinish={onFinish}>
      {/* Username / Email */}
      <Form.Item
        label="Username or Email"
        name="username"
        rules={[{ required: true, message: 'Username or Email is required' }]}
      >
        <Input placeholder="Enter your username or email" />
      </Form.Item>

      {/* Password */}
      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: 'Password is required' }]}
      >
        <Input.Password placeholder="Enter your password" />
      </Form.Item>

      {/* Remember me (left) - Forgot password (right) */}
      <Form.Item>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          >
            Remember me
          </Checkbox>

          <Link href="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </Form.Item>

      {/* Login button */}
      <Button type="primary" htmlType="submit" block>
        Login
      </Button>
    </Form>
  );
}
