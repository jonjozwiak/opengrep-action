import * as os from 'os'

jest.mock('@actions/core')
jest.mock('os')

const mockPlatform = os.platform as jest.MockedFunction<typeof os.platform>
const mockArch = os.arch as jest.MockedFunction<typeof os.arch>

import { detectPlatform } from '../src/platform'

describe('detectPlatform', () => {
  it('should detect x64 Linux', () => {
    mockPlatform.mockReturnValue('linux')
    mockArch.mockReturnValue('x64')
    const info = detectPlatform()
    expect(info.binaryName).toBe('opengrep_manylinux_x86')
    expect(info.arch).toBe('amd64')
    expect(info.platform).toBe('linux')
  })

  it('should detect arm64 Linux', () => {
    mockPlatform.mockReturnValue('linux')
    mockArch.mockReturnValue('arm64')
    const info = detectPlatform()
    expect(info.binaryName).toBe('opengrep_manylinux_aarch64')
    expect(info.arch).toBe('arm64')
    expect(info.platform).toBe('linux')
  })

  it('should throw for macOS', () => {
    mockPlatform.mockReturnValue('darwin')
    mockArch.mockReturnValue('x64')
    expect(() => detectPlatform()).toThrow('Unsupported platform')
  })

  it('should throw for Windows', () => {
    mockPlatform.mockReturnValue('win32')
    mockArch.mockReturnValue('x64')
    expect(() => detectPlatform()).toThrow('Unsupported platform')
  })

  it('should throw for unsupported architecture', () => {
    mockPlatform.mockReturnValue('linux')
    mockArch.mockReturnValue('ia32')
    expect(() => detectPlatform()).toThrow('Unsupported architecture')
  })
})
