'use client';
import { Form, Input, Button } from 'antd';
// Import các component UI từ Ant Design {Form: khung form tổng ,Input: ô nhập text ,Button: nút bấm}


export default function LoginForm() {  // Mới làm UI form đăng nhập
  return (
  <Form layout="vertical">
    <Form.Item label="Username or Email">
      <Input placeholder="Enter your username or email" />
    </Form.Item>

    <Form.Item label="Password">
      <Input.Password placeholder="Enter your password" />
    </Form.Item>

    <Button type="primary" block>
      Login
    </Button>
  </Form>
);
}
    