import { describe, expect, it } from 'vitest'
import {
  getAssociationExecutablePath,
  registerMowlFileAssociation,
  type WindowsRegistryWriter
} from './windows-file-association'

describe('Windows MOWL file association', () => {
  it('uses the portable wrapper path when running from a temporary extraction directory', () => {
    expect(
      getAssociationExecutablePath(
        'C:\\Users\\person\\AppData\\Local\\Temp\\mowl.exe',
        'D:\\Apps\\MOWL-1.0.0-portable.exe'
      )
    ).toBe('D:\\Apps\\MOWL-1.0.0-portable.exe')
  })

  it('registers the portable mowl executable as the .mowldb open command', () => {
    const entries: Array<[string, string]> = []
    const registry: WindowsRegistryWriter = {
      add: (key, value) => entries.push([key, value])
    }

    registerMowlFileAssociation('C:\\Portable MOWL\\mowl.exe', registry)

    expect(entries).toEqual([
      ['HKCU\\Software\\Classes\\.mowldb', 'MOWL.Database'],
      ['HKCU\\Software\\Classes\\MOWL.Database', 'MOWL Database'],
      ['HKCU\\Software\\Classes\\MOWL.Database\\DefaultIcon', '"C:\\Portable MOWL\\mowl.exe",0'],
      [
        'HKCU\\Software\\Classes\\MOWL.Database\\shell\\open\\command',
        '"C:\\Portable MOWL\\mowl.exe" "%1"'
      ]
    ])
  })
})
