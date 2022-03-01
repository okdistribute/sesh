/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import React, { useEffect } from "react";
import { Upwell, Author, Layer } from "api";
import ListDocuments, {
  ButtonTab,
  InfoTab,
} from "./ListDocuments";
import * as Documents from "../Documents";
import { EditReviewView } from "./EditReview";
//@ts-ignore
import debounce from "lodash.debounce";
import { SYNC_STATE } from '../types';
import { SyncIndicator } from "./SyncIndicator";

type DocumentViewProps = {
  id: string,
  author: Author
};

const AUTOSAVE_INTERVAL = 3000; //ms

export default function MaybeDocument(props: DocumentViewProps) {
  let [layers, setLayers] = React.useState<Layer[]>([]);
  let [root, setRoot] = React.useState<Layer>();
  let [sync_state, setSyncState] = React.useState<SYNC_STATE>(SYNC_STATE.SYNCED)

  function render(upwell: Upwell) {
    let layers = upwell.layers().reverse()
    let root = upwell.rootLayer()
    setRoot(root);
    setLayers(layers.filter(l => l.id !== root.id));
  }

  useEffect(() => {
    async function get () {
      let upwell 
      try {
        upwell = await Documents.open(props.id) 
      } catch (err) {
        upwell = null
      }

      try {
        if (!upwell) upwell = await Documents.sync(props.id)
        render(upwell)
      } catch (err) {
        let upwell = await Documents.create(props.id)
        render(upwell)
      }
    }

    get()

  }, [props.id]);
  let save = () => {
    Documents.save(props.id).then((upwell) => {
      Documents.sync(props.id).then(() => {
        let upwell = Documents.get(props.id)
        Documents.save(props.id)
        setSyncState(SYNC_STATE.SYNCED)
        render(upwell)
      }).catch(err => {
        setSyncState(SYNC_STATE.OFFLINE)
        render(upwell)
        console.error('failed to sync', err)
      })
    })
  }

  let debouncedSave = debounce(async () => {
    console.log('debounce')
    save()
  }, AUTOSAVE_INTERVAL);


  function onChangeMade (debounce: boolean) {
    setSyncState(SYNC_STATE.LOADING)
    if (debounce) debouncedSave()
    else save()
  }

  if (!root) return <div>Loading..</div>;
  return <DocumentView
    id={props.id}
    sync_state={sync_state}
    layers={layers}
    onChangeMade={onChangeMade}
    root={root}
    author={props.author}
  />;
}


export function DocumentView(props: {
  id: string,
  layers: Layer[],
  root?: Layer,
  author: Author,
  sync_state: SYNC_STATE,
  onChangeMade: Function
}) {
  const { id, root, layers, author, sync_state, onChangeMade } = props;
  
  let [visible, setVisible] = React.useState<Layer[]>(layers.length ? layers.slice(0, 1) : []);

  let onArchiveClick = () => {
    setVisible([]);
    return; // reset visible layers
  };

  let onLayerClick = (layer: Layer) => {
    let exists = visible.findIndex((l) => l.id === layer.id);
    if (exists > -1) {
      setVisible(visible.filter((l) => l.id !== layer.id));
    } else {
      setVisible(visible.concat([layer]));
    }
  };

  const handleInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>,
    l: Layer
  ) => {
    let upwell = Documents.get(id);
    l.message = e.target.value;
    upwell.set(l.id, l);
    onChangeMade();
  };

  let onTextChange = () => {
    onChangeMade(true)
  }

  let onCreateLayer = async () => {
    let message = "";
    // always forking from root layer (for now)
    let upwell = Documents.get(id)
    let root = upwell.rootLayer();
    let newLayer = root.fork(message, author);
    upwell.add(newLayer);
    onChangeMade()
    setVisible([newLayer])
  };

  let handleShareClick = (l: Layer) => {
    let upwell = Documents.get(id)
    l.shared = true;
    upwell.set(l.id, l)
    onChangeMade()
  }

  let getEditableLayer = () => {
    if (visible.length === 1) return visible[0];
    else return undefined;
  };

  let mergeVisible = async () => {
    if (!root) return console.error("no root race condition");
    let upwell = Documents.get(id)
    let merged = visible.reduce((prev: Layer, cur: Layer) => {
      if (cur.id !== root?.id) {
        upwell.archive(cur.id);
      }
      return Layer.merge(prev, cur);
    }, root);
    upwell.add(merged);
    onChangeMade()
    setVisible([]);
  };
  let sharedLayers = layers.filter((l: Layer) => !l.archived && l.shared && l.id !== root?.id)
                  
  if (!root) return <div>Loading...</div>
  return (
    <div
      id="folio"
      css={css`
        height: 100vh;
        display: flex;
        color: white;
        flex-direction: row;
        padding: 30px;
        background: url("/wood.png");
      `}
    >
      <SyncIndicator state={sync_state}></SyncIndicator>
      <div
        id="writing-zone"
        css={css`
          flex: 1 0 auto;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
          padding: 20px 40px 40px;
          padding-right: 20px;
          border-radius: 10px;
          display: flex;
          flex-direction: row;
        `}
      >

        <EditReviewView
          onChange={onTextChange}
          visible={visible}
          author={author}
          root={root}
        ></EditReviewView>
        <div
          id="right-side"
          css={css`
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            margin-left: -1px;
          `}
        >
          <div id="private" css={css``}>
            <InfoTab css={css``} title="Layers area">
              🌱 local
            </InfoTab>
            <ButtonTab onClick={onCreateLayer} title="new layer">
              ➕
            </ButtonTab>
              <ListDocuments
                onLayerClick={onLayerClick}
                layers={layers.filter(
                  (l: Layer) =>
                    !l.archived &&
                    !l.shared &&
                    l.id !== root?.id &&
                    l.author === author
                )}
                visible={visible}
                handleShareClick={handleShareClick}
                onInputBlur={handleInputBlur}
                editableLayer={getEditableLayer()}
              />
          </div>
          <div>

          {sharedLayers.length > 0 && 
          <>
            <InfoTab title="shared layers">
              🎂 shared
            </InfoTab>
                <ListDocuments
                  isBottom
                  onLayerClick={onLayerClick}
                  visible={visible}
                  layers={sharedLayers}
                  onInputBlur={handleInputBlur}
                  editableLayer={getEditableLayer()}
                />
              </>
          }
          </div>
          <div>
            <InfoTab css={css``} title="Archived area">
              📁 merged
            </InfoTab>
            <>
                <ListDocuments
                  isBottom
                  onLayerClick={onArchiveClick}
                  visible={visible}
                  layers={layers.filter(
                    (l: Layer) => l.archived && l.id !== root?.id
                  )}
                  onInputBlur={handleInputBlur}
                />
              </>
          </div>
        </div>
      </div>
      <div
        id="bottom-bar"
        css={css`
            position: absolute;
            bottom: 40px;
            right: 150px;
          `}
      >
        <Button onClick={mergeVisible}>Merge visible</Button>
      </div>
    </div>
  );
}

type ButtonType = React.ClassAttributes<HTMLButtonElement> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button(props: ButtonType) {
  return (
    <button
      css={css`
        padding: 3px 14px;
        font-size: 14px;
        border-radius: 3px;
        border: none;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        background: white;
        color: black;
        &:hover {
          background: #d1eaff;
        }
        &:disabled {
          opacity: 70%;
          cursor: not-allowed;
          filter: grayscale(40%) brightness(90%);
        }
      `}
      {...props}
    />
  );
}

/*
  async function open(): Promise<Uint8Array> {
    let [fileHandle] = await showOpenFilePicker();
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  let onOpenClick = async () => {
    let binary: Uint8Array = await open();
    // this is a hack for demos as of December 21, we probably want to do something
    // totally different
    let layer = Layer.load(binary);
    await upwell.add(layer);
    window.location.href = "/layer/" + layer.id;
  };

  let onDownloadClick = async () => {
    let filename = layer.title + ".up";
    let el = window.document.createElement("a");
    let buf: Uint8Array = layer.save();
    el.setAttribute(
      "href",
      "data:application/octet-stream;base64," + buf.toString()
    );
    el.setAttribute("download", filename);
    el.click();
  };
  */
