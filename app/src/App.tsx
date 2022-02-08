import React from 'react'
import DocumentView from './components/DocumentView'
import ListDocuments from './components/ListDocuments'
import { Upwell, Layer } from 'api'
import { Route, useLocation } from "wouter";
import { showOpenFilePicker } from 'file-system-access';
import Documents from './Documents'

let documents: Upwell = Documents()

async function open (): Promise<Uint8Array> {
  let [fileHandle] = await showOpenFilePicker()
  const file = await fileHandle.getFile()
  return new Uint8Array(await file.arrayBuffer())
}

export default function App() {
  const [location, setLocation] = useLocation();

  let onOpenClick = async () => {
    let binary: Uint8Array = await open()
    // this is a hack for demos as of December 21, we probably want to do something
    // totally different
    let layer =  Layer.load(binary)
    await documents.add(layer)
    window.location.href = '/doc/' + layer.id
  }

  let onListClick = () => {
    setLocation('/')
  }

  return <div>
    <button onClick={onListClick}>List</button>
    <button onClick={onOpenClick}>Open</button>
    <Route path="/doc/:id">
      {(params) => <DocumentView id={params.id} />}
    </Route>
    <Route path="/" component={ListDocuments}>  </Route>
  </div>
}
