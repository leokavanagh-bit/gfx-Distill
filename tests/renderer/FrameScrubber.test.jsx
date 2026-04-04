import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FrameScrubber } from '../../src/renderer/src/components/FrameScrubber.jsx'

beforeEach(() => {
  window.api.ffmpeg = {
    getDuration: vi.fn().mockResolvedValue(120),
    extractFrame: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
  }
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
})
