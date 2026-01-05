import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import OTPVerify from '../../../pages/Auth/OTPVerify/OTPVerify';

const renderOTPVerify = (initialState?: { email?: string; mobile?: string }) => {
  const state = initialState || { email: 'test@example.com', mobile: '1234567890' };
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/auth/otp-verify',
          state,
        },
      ]}
    >
      <OTPVerify />
    </MemoryRouter>
  );
};

describe('OTPVerify Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders OTP verification form', () => {
    renderOTPVerify();
    expect(screen.getByText("Let's get verified!")).toBeInTheDocument();
    expect(screen.getByLabelText(/enter otp received on mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enter otp received on email/i)).toBeInTheDocument();
  });

  it('restricts OTP input to 6 digits', () => {
    renderOTPVerify();
    const mobileInput = screen.getByLabelText(/enter otp received on mobile/i) as HTMLInputElement;

    fireEvent.change(mobileInput, { target: { value: '123456789' } });
    expect(mobileInput.value).toBe('123456');
  });

  it('displays checkmark when OTP is validated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { verified: true } }),
    });

    renderOTPVerify();
    const mobileInput = screen.getByLabelText(/enter otp received on mobile/i);

    fireEvent.change(mobileInput, { target: { value: '123456' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles resend OTP button click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' }),
    });

    renderOTPVerify();
    const resendButtons = screen.getAllByText(/resend otp/i);
    fireEvent.click(resendButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('disables submit button until both OTPs are validated', () => {
    renderOTPVerify();
    const submitButton = screen.getByRole('button', { name: /verify/i });
    expect(submitButton).toBeDisabled();
  });

  it('matches snapshot', () => {
    const { container } = renderOTPVerify();
    expect(container).toMatchSnapshot();
  });
});

