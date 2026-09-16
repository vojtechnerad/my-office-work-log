import { execFileSync } from 'child_process'

export interface WindowsRegistryWriter {
  add: (key: string, value: string) => void
}

export function createWindowsRegistryWriter(): WindowsRegistryWriter {
  return {
    add: (key, value) => {
      execFileSync('reg.exe', ['add', key, '/ve', '/d', value, '/f'], {
        stdio: 'ignore',
        windowsHide: true
      })
    }
  }
}

export function registerMowlFileAssociation(
  executablePath: string,
  registry: WindowsRegistryWriter = createWindowsRegistryWriter()
): void {
  const classesKey = 'HKCU\\Software\\Classes'
  const fileType = 'MOWL.Database'
  const command = `"${executablePath}" "%1"`

  registry.add(`${classesKey}\\.mowldb`, fileType)
  registry.add(`${classesKey}\\${fileType}`, 'MOWL Database')
  registry.add(`${classesKey}\\${fileType}\\DefaultIcon`, `"${executablePath}",0`)
  registry.add(`${classesKey}\\${fileType}\\shell\\open\\command`, command)
}

export function getAssociationExecutablePath(
  executablePath: string,
  portableExecutablePath: string | undefined
): string {
  return portableExecutablePath || executablePath
}
