import { VERSION } from '../update'

// Credit and version, shown on the welcome screens.
export default function VersionLine() {
  return (
    <p className="ver">
      Developed by <a href="https://linktr.ee/jassimalfonso" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Jassim Alfonso</a> · Version {VERSION}
    </p>
  )
}
