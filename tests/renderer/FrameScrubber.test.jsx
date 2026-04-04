import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FrameScrubber } from '../../src/renderer/src/components/FrameScrubber.jsx'

beforeEach(() => {
  window.api.ffmpeg = {
    getDuration: vi.fn().mockResolvedValue(120),
    extractFrame: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
  }
})

afterEach(() => {
  delete window.api.ffmpeg
})

describe('FrameScrubber', () => {
  it('shows placeholder when no mxfPath is provided', () => {
    render(<FrameScrubber mxfPath={null} onFrameChange={vi.fn()} />)
    expect(screen.getByTestId('frame-placeholder')).toBeInTheDocument()
  })

  it('calls getDuration when mxfPath is set', async () => {
    render(<FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={vi.fn()} />)
    await waitFor(() => expect(window.api.ffmpeg.getDuration).toHaveBeenCalledWith('/renders/MyShow.mxf'))
  })

  it('shows frame image after extraction', async () => {
    render(<FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,abc'))
  })

  it('calls onFrameChange with seconds when slider moves', async () => {
    const onFrameChange = vi.fn()
    render(<FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={onFrameChange} />)
    await waitFor(() => screen.getByRole('slider'))
    fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } })
    await waitFor(() => expect(onFrameChange).toHaveBeenCalledWith(60))
  })

  it('shows loading indicator while extracting', async () => {
    // Make extractFrame hang until we resolve it manually
    let resolveExtract
    window.api.ffmpeg.extractFrame = vi.fn(
      () => new Promise((res) => { resolveExtract = res })
    )
    render(<FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={vi.fn()} />)
    // getDuration resolves immediately, triggering extraction
    await waitFor(() => expect(screen.getByText('Extracting...')).toBeInTheDocument())
    // Now resolve and confirm loading goes away
    resolveExtract('data:image/png;base64,abc')
    await waitFor(() => expect(screen.queryByText('Extracting...')).not.toBeInTheDocument())
  })

  it('does not update frame when mxfPath changes before extraction completes', async () => {
    const { rerender } = render(
      <FrameScrubber mxfPath="/renders/A.mxf" onFrameChange={vi.fn()} />
    )
    // Change path before extraction for A completes
    rerender(<FrameScrubber mxfPath="/renders/B.mxf" onFrameChange={vi.fn()} />)
    await waitFor(() =>
      expect(window.api.ffmpeg.getDuration).toHaveBeenCalledWith('/renders/B.mxf')
    )
    // Frame should show B's result, not A's
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,abc')
    )
  })
})
