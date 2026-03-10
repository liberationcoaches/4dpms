import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignUp from '../../../pages/Auth/SignUp/SignUp';

const renderSignUp = () => {
  return render(
    <BrowserRouter>
      <SignUp />
    </BrowserRouter>
  );
};

describe('SignUp Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders sign up form', () => {
    renderSignUp();
    expect(screen.getByText("Let's get you onboard")).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument();
  });

  it('displays validation errors for empty fields', async () => {
    renderSignUp();
    const submitButton = screen.getByRole('button', { name: /signup/i });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderSignUp();
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /signup/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        data: { userId: '123', email: 'test@example.com', mobile: '1234567890' },
      }),
    });

    renderSignUp();

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/mobile/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Test Company' } });
    fireEvent.change(screen.getByLabelText(/industry/i), { target: { value: 'Technology' } });

    const submitButton = screen.getByRole('button', { name: /signup/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/signup'),
        expect.any(Object)
      );
    });
  });

  it('handles LinkedIn login button click', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    renderSignUp();

    const linkedInButton = screen.getByRole('button', { name: /login with linkedin/i });
    fireEvent.click(linkedInButton);

    expect(consoleSpy).toHaveBeenCalledWith('LinkedIn login clicked');
    consoleSpy.mockRestore();
  });

  it('restricts mobile input to 10 digits', () => {
    renderSignUp();
    const mobileInput = screen.getByLabelText(/mobile/i) as HTMLInputElement;

    fireEvent.change(mobileInput, { target: { value: '123456789012345' } });
    expect(mobileInput.value).toBe('1234567890');
  });

  it('matches snapshot', () => {
    const { container } = renderSignUp();
    expect(container).toMatchSnapshot();
  });
});

