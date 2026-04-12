import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VettingBanner } from '../../src/renderer/src/components/VettingBanner.jsx'

describe('VettingBanner', () => {
  it('renders nothing when status is null', () => {
    const { container } = render(
      <VettingBanner status={null} flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows spinner and scanning text when status is scanning', () => {
    render(
      <VettingBanner status="scanning" flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByTestId('scanning-spinner')).toBeInTheDocument()
    expect(screen.getByText(/scanning for typos/i)).toBeInTheDocument()
  })

  it('shows success message when status is clean', () => {
    render(
      <VettingBanner status="clean" flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByText(/no issues found/i)).toBeInTheDocument()
  })

  it('shows error message when status is error', () => {
    render(
      <VettingBanner status="error" flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByText(/could not scan/i)).toBeInTheDocument()
  })

  it('shows warning count and word chips when status is warnings', () => {
    const flags = [
      { word: 'recieve', timecode: 3 },
      { word: 'occured', timecode: 9 },
    ]
    render(
      <VettingBanner status="warnings" flags={flags} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByText(/2 possible typos/i)).toBeInTheDocument()
    expect(screen.getByText(/"recieve"/)).toBeInTheDocument()
    expect(screen.getByText(/"occured"/)).toBeInTheDocument()
  })

  it('shows singular "typo" for a single flag', () => {
    render(
      <VettingBanner
        status="warnings"
        flags={[{ word: 'recieve', timecode: 3 }]}
        onTimecodeSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText(/1 possible typo[^s]/i)).toBeInTheDocument()
  })

  it('calls onTimecodeSelect with timecode when a word chip is clicked', () => {
    const onTimecodeSelect = vi.fn()
    render(
      <VettingBanner
        status="warnings"
        flags={[{ word: 'recieve', timecode: 3 }]}
        onTimecodeSelect={onTimecodeSelect}
        onDismiss={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /"recieve"/i }))
    expect(onTimecodeSelect).toHaveBeenCalledWith(3)
  })

  it('calls onDismiss when Dismiss is clicked', () => {
    const onDismiss = vi.fn()
    render(
      <VettingBanner
        status="warnings"
        flags={[{ word: 'recieve', timecode: 3 }]}
        onTimecodeSelect={vi.fn()}
        onDismiss={onDismiss}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
