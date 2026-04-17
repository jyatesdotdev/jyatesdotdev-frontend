import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ReCaptchaProvider } from './recaptcha-provider'

vi.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children, reCaptchaKey }: any) => (
    <div data-testid="recaptcha-provider" data-key={reCaptchaKey}>
      {children}
    </div>
  ),
}))

describe('ReCaptchaProvider', () => {
  it('renders children with the correct reCaptchaKey', () => {
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key')
    const { getByTestId, getByText } = render(
      <ReCaptchaProvider>
        <div>Test Child</div>
      </ReCaptchaProvider>
    )

    const provider = getByTestId('recaptcha-provider')
    expect(provider).toBeInTheDocument()
    expect(provider).toHaveAttribute('data-key', 'test-site-key')
    expect(getByText('Test Child')).toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})
