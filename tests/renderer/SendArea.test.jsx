import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SendArea } from '../../src/renderer/src/components/SendArea.jsx'

const readyParams = {
  mxfPath: '/renders/MyShow.mxf',
  scrubSeconds: 30,
  studio: { name: 'London', uncPath: '\\\\lon-gv01\\watch\\' },
  pngWatchFolder: '\\\\server\\png\\',
  title: '',
  jobId: '8C378D',
}

beforeEach(() => {
  window.api.send = {
    execute: vi.fn().mockResolvedValue(undefined),
    onProgress: vi.fn(),
    removeProgressListeners: vi.fn(),
  }
})

afterEach(() => {
  delete window.api.send
})

describe('SendArea', () => {
  it('renders disabled Send button when params are incomplete', () => {
    render(<SendArea params={{ ...readyParams, jobId: '' }} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('renders enabled Send button when all required params are present', () => {
    render(<SendArea params={readyParams} />)
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled()
  })

  it('calls api.send.execute with params on click', async () => {
    render(<SendArea params={readyParams} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(window.api.send.execute).toHaveBeenCalledWith(readyParams))
  })

  it('shows error message when execute rejects', async () => {
    window.api.send.execute.mockRejectedValue(new Error('Network unreachable'))
    render(<SendArea params={readyParams} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByText(/network unreachable/i)).toBeInTheDocument())
  })

  it('shows Retry button on error', async () => {
    window.api.send.execute.mockRejectedValue(new Error('fail'))
    render(<SendArea params={readyParams} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument())
  })
})
