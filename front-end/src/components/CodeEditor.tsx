import Editor from '@monaco-editor/react'
import { FC } from 'react'

type Props = {
  content?: string
  onChange?: (value: string | undefined) => void
}

const CodeEditor: FC<Props> = ({ content, onChange }) => {
  return <Editor theme="vs-dark" defaultLanguage="javascript" value={content} onChange={onChange} height="20rem" />
}

export default CodeEditor
