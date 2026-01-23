'use client';

import { Form, Input, Button, message } from 'antd';
// message: hiển thị thông báo success / error

import { login } from '@/services/auth.service';
// import hàm login từ service (tách khỏi UI)

/**
 * LoginForm
 * - UI + validation
 * - Gọi API login
 * - Chưa lưu token
 * - Chưa redirect
 */
export default function LoginForm() {
  // Ant Design message instance
  const [messageApi, contextHolder] = message.useMessage();

  /**
   * Hàm submit form khi validate OK
   * values = { identifier, password }
   */
  const onFinish = async (values: {
    identifier: string;
    password: string;
  }) => {
    // Gọi API login
    const result = await login(values);

    // Login thất bại
    if (!result.success) {
      messageApi.error(result.message || 'Login failed');
      return;
    }

    // Login thành công (tạm thời chỉ báo)
    messageApi.success('Login successful');

    // TODO (STEP SAU):
    // - Lưu token
    // - Set auth context
    // - Redirect theo role
  };

  return (
    <>
      {/* Context bắt buộc cho antd message */}
      {contextHolder}

      <Form
        layout="vertical"
        onFinish={onFinish}
      >
        {/* Username hoặc Email */}
        <Form.Item
          label="Username or Email"
          name="identifier"
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

        {/* Submit */}
        <Button
          type="primary"
          htmlType="submit"
          block
        >
          Login
        </Button>
      </Form>
    </>
  );
}
