'use client';

import { Form, Input, Button } from 'antd';
// Form  : container quản lý state + validation
// Input : ô nhập text
// Button: nút submit

/**
 * LoginForm
 * - Chỉ xử lý UI + validation
 * - Chưa gọi API
 * - Chưa xử lý auth / token
 */
export default function LoginForm() {
  /**
   * Hàm được gọi khi form validate OK
   * values = { identifier, password }
   */
  const onFinish = (values: {
    identifier: string;
    password: string;
  }) => {
    // Tạm thời log ra để kiểm tra luồng submit
    console.log('Login form values:', values);
  };

  return (
    <Form
      layout="vertical"
      onFinish={onFinish} // Chỉ chạy khi validate pass
    >
      {/* Username hoặc Email */}
      <Form.Item
        label="Username or Email"
        name="identifier" // key trong values
        rules={[
          {
            required: true,
            message: 'Please enter your username or email',
          },
        ]}
      >
        <Input placeholder="Enter your username or email" />
      </Form.Item>

      {/* Password */}
      <Form.Item
        label="Password"
        name="password"
        rules={[
          {
            required: true,
            message: 'Please enter your password',
          },
          {
            min: 6,
            message: 'Password must be at least 6 characters',
          },
        ]}
      >
        <Input.Password placeholder="Enter your password" />
      </Form.Item>

      {/* Submit button */}
      <Button
        type="primary"
        htmlType="submit" // Bắt buộc để Form submit
        block
      >
        Login
      </Button>
    </Form>
  );
}
