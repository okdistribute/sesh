import * as Automerge from "automerge-wasm-pack"
import { Author, AuthorId } from "."
import debug from "debug"

const ROOT = "_root"

export class UpwellMetadata {
  doc: Automerge.Automerge

  constructor(doc: Automerge.Automerge) {
    if (!doc) throw new Error('doc required')
    this.doc = doc
  }

  static load(binary: Uint8Array): UpwellMetadata {
    return new UpwellMetadata(Automerge.loadDoc(binary))
  }

  static create(id: string, main_id: string): UpwellMetadata {
    debug(`creating metadata ${id}  ${main_id}`)
    let doc = Automerge.create()
    doc.set(ROOT, 'id', id) 
    doc.set(ROOT, 'main_id', main_id)
    doc.set_object(ROOT, 'archived', {})
    doc.set_object(ROOT, 'authors', {})
    return new UpwellMetadata(doc)
  }

  _getArchivedLayersObj(): Automerge.ObjID {
    let value = this.doc.value(ROOT, 'archived')
    let map;
    if (!value) {
      map = this.doc.set_object(ROOT, 'archived', {})
    } else if (value[0] === 'map') {
      map = value[1]
    } else {
      throw new Error('Archived property not a map')
    }
    return map
  }

  isArchived(id: string): boolean {
    let map = this._getArchivedLayersObj()
    let maybe = this.doc.value(map, id)
    if (maybe && maybe[0] === 'boolean') {
      return maybe[1]
    } else {
      return false
    }
  }

  archive(id: string) {
    let map = this._getArchivedLayersObj()
    this.doc.set(map, id, true, 'boolean')
  }

  addAuthor(author: Author) {
    this.doc.set('/authors', author.id, author.name)
  }

  getAuthor(authorId: AuthorId): Author | undefined {
    let authors = this.doc.value(ROOT, 'authors')
    if (authors && authors[0] === 'map') {
      let value = this.doc.value(authors[1], authorId)
      if (value && value[0] === 'str') return {id: authorId, name: value[1]}
      else return undefined
    }
    else return undefined

  }

  get id(): string {
    let value = this.doc.value(ROOT, 'id')
    if (value) return value[1] as string
    else return ''
  }

  get main(): string {
    let value = this.doc.value(ROOT, 'main_id')
    if (value) return value[1] as string
    else return ''
  }

  set main (id: string) {
    this.doc.set(ROOT, 'main_id', id)
  }

}
