'use client';

import { Form, Input, Button, message } from 'antd';
// Form    : quản lý dữ liệu + validation
// Input   : ô nhập text
// Button  : nút submit
// message : hiển thị thông báo nhanh (success / error)

export default function LoginForm() {

  /**
   * Hàm này sẽ được gọi KHI:
   * - User bấm nút Login
   * - Và toàn bộ validation đều hợp lệ
   *
   * values là object chứa dữ liệu form
   * ví dụ:
   * {
   *   account: 'admin',
   *   password: '123456'
   * }
   */
  const onFinish = (values: { account: string; password: string }) => {
    console.log('Login form values:', values);
    message.success('Form submit thành công (chưa gọi API)');
  };


  const onFinishFailed = () => {
    message.error('Vui lòng nhập đầy đủ thông tin');
  };

  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
    >
      {/* Field: Username hoặc Email */}
      <Form.Item
        label="Username or Email"
        name="account" // key để Form quản lý dữ liệu
        rules={[
          {
            required: true,
            message: 'Please enter your username or email',
          },
        ]}
      >
        <Input placeholder="Enter your username or email" />
      </Form.Item>

      {/* Field: Password */}
      <Form.Item
        label="Password"
        name="password"
        rules={[
          {
            required: true,
            message: 'Please enter your password',
          },
        ]}
      >
        <Input.Password placeholder="Enter your password" />
      </Form.Item>

      {/* Button submit form */}
      <Button
        type="primary"
        htmlType="submit" // QUAN TRỌNG: để Form biết đây là nút submit
        block
      >
        Login
      </Button>
    </Form>
  );
}
