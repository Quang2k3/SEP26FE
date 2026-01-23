'use client';

import { Form, Input, Button } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {

  const { login } = useAuth(); 

  const onFinish = (values: any) => {
    // tạm fake user để test
    login({
      id: '1',
      username: values.username,
      role: 'ADMIN',
    });
  };

  return (
    <Form layout="vertical" onFinish={onFinish}>
      <Form.Item
        label="Username or Email"
        name="username"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true }]}
      >
        <Input.Password />
      </Form.Item>

      <Button type="primary" htmlType="submit" block>
        Login
      </Button>
    </Form>
  );
}
