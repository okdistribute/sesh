/** @jsxImportSource @emotion/react */
//import React, { useEffect, useRef, useState } from 'react'
import React, { useState, useRef } from 'react'
import { Upwell, Draft, Author } from 'api'
//import Documents from '../Documents'
import deterministicColor from '../color'

import { schema } from '../upwell-pm-schema'
import { ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
//import { MarkType, Slice } from 'prosemirror-model'
import { MarkType } from 'prosemirror-model'
import { baseKeymap, Command, toggleMark } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { EditorState, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform'
import { contextMenu } from '../prosemirror/ContextMenuPlugin'

import ProsemirrorRenderer from '../ProsemirrorRenderer'
import UpwellSource from './upwell-source'
import { css } from '@emotion/react'
import Documents from '../Documents'

let documents = Documents()

type Props = {
  upwell: Upwell
  editableDraftId: string
  author: Author
  onChange: any
}

const toggleBold = toggleMarkCommand(schema.marks.strong)
const toggleItalic = toggleMarkCommand(schema.marks.em)

function toggleMarkCommand(mark: MarkType): Command {
  return (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined
  ) => {
    return toggleMark(mark)(state, dispatch)
  }
}

export const textCSS = css`
  width: 100%;
  height: 100%;
  border: 1px solid lightgray;
  border-width: 0 1px 1px 0;
  padding: 10px 20px;
  resize: none;
  font-size: 16px;
  line-height: 20px;
  background-color: white;
  overflow: auto;

  white-space: pre-line;

  .ProseMirror {
    height: 100%;
  }
  .ProseMirror:focus-visible {
    outline: 0;
  }
`

let prosemirrorToAutomergeNumber = (position: number, draft: Draft): number => {
  let i = 0
  let l = draft.text.length

  while (i < l) {
    i = draft.text.indexOf('\uFFFC', i + 1)
    if (i >= position || i === -1) break
    position--
  }

  // we always start with a block, so we should never be inserting
  // into the document at position 0
  if (position === 0) throw new Error('this is not right')

  let max = Math.min(position, draft.text.length)
  let min = Math.max(max, 0)
  return min
}

let prosemirrorToAutomerge = (
  position: { from: number; to: number },
  draft: Draft
): { from: number; to: number } => {
  return {
    from: prosemirrorToAutomergeNumber(position.from, draft),
    to: prosemirrorToAutomergeNumber(position.to, draft),
  }
}

export function Editor(props: Props) {
  let { upwell, editableDraftId, onChange, author } = props

  function getState(pmDoc: any) {
    return EditorState.create({
      schema,
      doc: pmDoc,
      plugins: [
        contextMenu([
          {
            view: () => {
              let commentButton = document.createElement('button')
              commentButton.innerText = '💬'
              return commentButton
            },

            handleClick: (
              e: any,
              view: EditorView,
              contextMenu: HTMLDivElement,
              buttonEl: HTMLButtonElement
            ) => {
              let { from, to } = view.state.selection
              let message = prompt('what is your comment')

              let commentMark = schema.mark('comment', {
                id: 'new-comment',
                author: author,
                authorColor: deterministicColor(author.id),
                message,
              })
              let tr = view.state.tr.addMark(from, to, commentMark)
              view.dispatch(tr)

              contextMenu.style.display = 'none'
            },
          },
        ]),
        history(),
        keymap({
          ...baseKeymap,
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
          'Mod-b': toggleBold,
          'Mod-i': toggleItalic,
        }),
      ],
    })
  }

  let editableDraft = upwell.get(editableDraftId)
  let atjsonDraft = UpwellSource.fromRaw(editableDraft)
  let pmDoc = ProsemirrorRenderer.render(atjsonDraft)
  const [state, setState] = useState<EditorState>(getState(pmDoc))
  //const [heads, setHeads] = useState<string[]>(editableDraft.doc.getHeads())

  const viewRef = useRef(null)

  /*
   * this was breaking things badly in strange ways, so just commenting out for the moment.
   *
  useEffect(() => {
    editableDraft.subscribe((doc: Draft) => {
      let change: any = doc.getChanges(heads)
      if (change.length) {
        let [authorId] = change[0].actor.split('0000')
        if (authorId === documents.author.id) return
      }

      let atjsonDraft = UpwellSource.fromRaw(doc)
      let pmDoc = ProsemirrorRenderer.render(atjsonDraft)

      let { selection } = state

      // TODO: transform automerge to prosemirror transaction
      let transaction = state.tr
        .replace(0, state.doc.content.size, new Slice(pmDoc.content, 0, 0))
        .setSelection(selection)
      let newState = state.apply(transaction)
      setState(newState)
      setHeads(doc.doc.getHeads())
    })
    return () => {
      editableDraft.subscribe(() => {})
    }
  })
  */

  let dispatchHandler = (transaction: any) => {
    for (let step of transaction.steps) {
      if (step instanceof ReplaceStep) {
        let { from, to } = prosemirrorToAutomerge(step, editableDraft)

        if (from !== to) {
          editableDraft.deleteAt(from, to - from)
        }

        if (step.slice) {
          let insOffset = from
          step.slice.content.forEach((node, idx) => {
            if (node.type.name === 'text' && node.text) {
              editableDraft.insertAt(insOffset, node.text)
              insOffset += node.text.length
            } else if (node.type.name === 'paragraph') {
              if (idx !== 0)
                // @ts-ignore
                editableDraft.insertBlock(insOffset++, node.type.name)

              let nodeText = node.textBetween(0, node.content.size)
              editableDraft.insertAt(insOffset, nodeText)
              insOffset += nodeText.length
            } else {
              alert(
                `Hi! We would love to insert that text (and other stuff), but
                this is a research prototype, and that action hasn't been
                implemented.`
              )
            }
          })
        }
      } else if (step instanceof AddMarkStep) {
        let { from, to } = prosemirrorToAutomerge(step, editableDraft)
        let mark = step.mark

        if (mark.type.name === 'comment') {
          editableDraft.insertComment(
            from,
            to,
            mark.attrs.message,
            mark.attrs.author.id
          )
          documents.save(upwell.id)
        } else {
          editableDraft.mark(mark.type.name, `(${from}..${to})`, '')
        }
      } else if (step instanceof RemoveMarkStep) {
        // TK not implemented because automerge doesn't support removing marks yet
      }
    }

    onChange(editableDraft)
    let newState = state.apply(transaction)
    setState(newState)
  }

  let color = deterministicColor(editableDraft.authorId)
  return (
    <ProseMirror
      state={state}
      ref={viewRef}
      dispatchTransaction={dispatchHandler}
      css={css`
        ${textCSS}
        caret-color: ${color?.copy({ opacity: 1 }).toString() || 'auto'};
      `}
    />
  )
}
