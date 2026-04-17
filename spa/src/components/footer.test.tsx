import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from './footer'

describe('Footer', () => {
  it('renders the RSS link', () => {
    render(<Footer />)
    const rssLink = screen.getByRole('link', { name: /rss/i })
    expect(rssLink).toBeInTheDocument()
    expect(rssLink).toHaveAttribute('href', '/rss')
  })

  it('renders the GitHub link', () => {
    render(<Footer />)
    const githubLink = screen.getByRole('link', { name: /github/i })
    expect(githubLink).toBeInTheDocument()
    expect(githubLink).toHaveAttribute('href', 'https://github.com/jyatesdotdev')
  })

  it('renders the copyright text', () => {
    render(<Footer />)
    const year = new Date().getFullYear().toString()
    const copyrightText = screen.getByText(new RegExp(`© ${year} MIT Licensed`, 'i'))
    expect(copyrightText).toBeInTheDocument()
  })
})
