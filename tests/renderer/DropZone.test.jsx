import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DropZone } from '../../src/renderer/src/components/DropZone.jsx'

describe('DropZone', () => {
  it('renders drop prompt when no file is loaded', () => {
    render(<DropZone onFile={vi.fn()} />)
    expect(screen.getByText(/drop mxf file here/i)).toBeInTheDocument()
  })

  it('shows filename when file prop is provided', () => {
    render(<DropZone file="/renders/MyShow.mxf" onFile={vi.fn()} />)
    expect(screen.getByText('MyShow.mxf')).toBeInTheDocument()
  })

  it('calls onFile with file path on valid drop', () => {
    const onFile = vi.fn()
    render(<DropZone onFile={onFile} />)
    const zone = screen.getByTestId('drop-zone')
    const file = new File(['data'], 'MyShow.mxf', { type: 'video/mxf' })
    Object.defineProperty(file, 'path', { value: '/renders/MyShow.mxf' })
    fireEvent.drop(zone, {
      dataTransfer: { files: [file], types: ['Files'] }
    })
    expect(onFile).toHaveBeenCalledWith('/renders/MyShow.mxf')
  })

  it('shows error for non-MXF files', () => {
    render(<DropZone onFile={vi.fn()} />)
    const zone = screen.getByTestId('drop-zone')
    const file = new File(['data'], 'MyShow.mp4', { type: 'video/mp4' })
    fireEvent.drop(zone, {
      dataTransfer: { files: [file], types: ['Files'] }
    })
    expect(screen.getByText(/only .mxf files/i)).toBeInTheDocument()
  })
})
