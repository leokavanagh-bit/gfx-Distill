import { render, screen, fireEvent } from '@testing-library/react'
import { MetadataFields } from '../../src/renderer/src/components/MetadataFields.jsx'

describe('MetadataFields', () => {
  it('renders Document Title and Job ID inputs', () => {
    render(<MetadataFields title="" jobId="" onChange={vi.fn()} />)
    expect(screen.getByLabelText(/document title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/job id/i)).toBeInTheDocument()
  })

  it('calls onChange with updated title', () => {
    const onChange = vi.fn()
    render(<MetadataFields title="" jobId="8C378D" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/document title/i), { target: { value: 'My Show' } })
    expect(onChange).toHaveBeenCalledWith({ title: 'My Show', jobId: '8C378D' })
  })

  it('calls onChange with updated jobId', () => {
    const onChange = vi.fn()
    render(<MetadataFields title="My Show" jobId="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/job id/i), { target: { value: '8C378D' } })
    expect(onChange).toHaveBeenCalledWith({ title: 'My Show', jobId: '8C378D' })
  })
})
