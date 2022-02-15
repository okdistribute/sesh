import { Author, Upwell, Layer, Heads } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';

describe('upwell', () => {
  it('subscribes to document changes', async () => {
    let d = await Upwell.create()
    let layers = await d.layers()
    assert.lengthOf(layers, 1)

    let doc: Layer = Layer.fork('New layer', 'Susan', layers[0])
    await d.add(doc)
    assert.lengthOf(await d.layers(), 2)

    let times = 0
    doc.subscribe((doc: Layer, heads: Heads) => {
      times++
      if (times === 1) assert.equal(doc.text, 'Hello')
      if (times === 2) assert.equal(doc.text, 'Hola')
    })

    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    doc.commit('Added hello')

    doc.insertAt(0, 'H')
    doc.deleteAt(1)
    doc.insertAt(1, 'o')
    doc.deleteAt(2)
    doc.deleteAt(3)
    doc.insertAt(3, 'a')
    doc.deleteAt(4)
    doc.commit('Translated to Spanish')
    await new Promise(resolve => setTimeout(resolve, 1000));
    assert.equal(times, 2)
  })

  it('saves and loads from a file', async () => {
    let d = await Upwell.create()
    let e = await Upwell.create()

    let layers = await d.layers()
    let ddoc = layers[0]
    let file = ddoc.save()
    let edoc = Layer.load(file)
    await e.add(edoc)

    ddoc.insertAt(0, Array.from('Upwelling: Contextual Writing'), 'title')

    let binary = ddoc.save()
    let layer = Layer.load(binary)
    await e.add(layer)
    assert.equal(layer.title, ddoc.title)
  })


  it('creates layers with authors', async () => {
    let first_author: Author =  'Susan'
    let d = await Upwell.create({ author: first_author})
    let layers = await d.layers()
    let doc = layers[0]
    assert.equal(d.authors.size, 1)
    assert.isTrue(d.authors.has(first_author))

    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    assert.equal(doc.text, 'Hello')
    await d.persist(doc)

    let name = 'Started typing on the train'
    let author: Author = 'Theroux'
    let newLayer = Layer.fork(name, author, doc)
    await d.add(newLayer)
    assert.equal(d.authors.size, 2)
    assert.sameMembers(Array.from(d.authors), [first_author, author])

    newLayer.insertAt(0, 'H')
    newLayer.deleteAt(1)
    newLayer.insertAt(1, 'o')
    newLayer.deleteAt(2)
    newLayer.deleteAt(3)
    newLayer.insertAt(3, 'a')
    newLayer.deleteAt(4)
    assert.equal(newLayer.text, 'Hola')
    assert.equal(newLayer.author, author)
  })

  it('merges two layers', async () => {
    let first_author: Author =  'Susan'
    let d = await Upwell.create({ author: first_author})
    let layers = await d.layers()
    let doc = layers[0]

    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    assert.equal(doc.text, 'Hello')
    await d.persist(doc)

    let name = 'Started typing on the train'
    let author: Author = 'Theroux'
    let newLayer = Layer.fork(name, author, doc)
    await d.add(newLayer)
    assert.equal(d.authors.size, 2)


    newLayer.insertAt(5, ' ')
    newLayer.insertAt(6, 'w')
    newLayer.insertAt(7, 'o')
    newLayer.insertAt(8, 'r')
    newLayer.insertAt(9, 'l')
    newLayer.insertAt(10, 'd')

    let merged = Layer.merge(doc, newLayer)
    assert.equal(merged.text, 'Hello world')

    await d.add(merged)
    layers = await d.layers()
    console.log(layers)
    assert.equal(layers.length, 2)
    await d.archive(newLayer.id)
    layers = await d.layers()
    assert.equal(layers[1].archived, true)
  })
})