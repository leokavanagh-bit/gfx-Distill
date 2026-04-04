import { render, screen, fireEvent } from '@testing-library/react'
import { StudioDropdown } from '../../src/renderer/src/components/StudioDropdown.jsx'

const studios = [
  { name: 'London', uncPath: '\\\\lon-gv01\\watch\\' },
  { name: 'Manchester', uncPath: '\\\\man-gv01\\watch\\' },
]

describe('StudioDropdown', () => {
  it('renders a placeholder option and all studios', () => {
    render(<StudioDropdown studios={studios} value={null} onChange={vi.fn()} />)
    expect(screen.getByText('Select studio...')).toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('Manchester')).toBeInTheDocument()
  })

  it('calls onChange with the selected studio object', () => {
    const onChange = vi.fn()
    render(<StudioDropdown studios={studios} value={null} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } })
    expect(onChange).toHaveBeenCalledWith(studios[0])
  })

  it('shows the selected studio name', () => {
    render(<StudioDropdown studios={studios} value={studios[1]} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('1')
  })
})
