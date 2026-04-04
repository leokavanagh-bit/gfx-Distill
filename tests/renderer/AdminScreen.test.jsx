import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminScreen } from '../../src/renderer/src/components/AdminScreen.jsx'

const mockConfig = {
  pngWatchFolder: '\\\\server\\png\\',
  studios: [
    { name: 'London', uncPath: '\\\\lon-gv01\\watch\\' },
    { name: 'Manchester', uncPath: '\\\\man-gv01\\watch\\' },
  ]
}

beforeEach(() => {
  window.api.config = {
    load: vi.fn().mockResolvedValue(mockConfig),
    save: vi.fn().mockResolvedValue(undefined),
    exportConfig: vi.fn().mockResolvedValue('/some/path/config.json'),
    importConfig: vi.fn().mockResolvedValue({ ...mockConfig, studios: [] }),
  }
  window.api.dialog = {
    openFolder: vi.fn().mockResolvedValue('/new/folder'),
    openFile: vi.fn().mockResolvedValue('/some/file'),
    saveFile: vi.fn().mockResolvedValue('/save/path'),
  }
})

afterEach(() => {
  delete window.api.config
  delete window.api.dialog
})

describe('AdminScreen', () => {
  it('renders studio dropdown with all studios', async () => {
    render(<AdminScreen />)
    await waitFor(() => expect(screen.getByText('London')).toBeInTheDocument())
    expect(screen.getByText('Manchester')).toBeInTheDocument()
  })

  it('shows studio fields when a studio is selected', async () => {
    render(<AdminScreen />)
    await waitFor(() => screen.getByText('London'))
    fireEvent.change(screen.getByTestId('studio-select'), { target: { value: '0' } })
    expect(screen.getByLabelText(/studio name/i)).toHaveValue('London')
    expect(screen.getByLabelText(/unc path/i)).toHaveValue('\\\\lon-gv01\\watch\\')
  })

  it('calls config.save when Save Studio is clicked', async () => {
    render(<AdminScreen />)
    await waitFor(() => screen.getByText('London'))
    fireEvent.change(screen.getByTestId('studio-select'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/studio name/i), { target: { value: 'London Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /save studio/i }))
    await waitFor(() => expect(window.api.config.save).toHaveBeenCalled())
  })

  it('calls config.exportConfig when Export Config is clicked', async () => {
    render(<AdminScreen />)
    await waitFor(() => screen.getByText('London'))
    fireEvent.click(screen.getByRole('button', { name: /export config/i }))
    await waitFor(() => expect(window.api.config.exportConfig).toHaveBeenCalled())
  })

  it('calls config.importConfig when Load from File is clicked', async () => {
    render(<AdminScreen />)
    await waitFor(() => screen.getByText('London'))
    fireEvent.click(screen.getByRole('button', { name: /load from file/i }))
    await waitFor(() => expect(window.api.config.importConfig).toHaveBeenCalled())
  })
})
