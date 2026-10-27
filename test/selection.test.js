const test = require('node:test')
const assert = require('node:assert')
const { defaultSelection, normalizeSelection, isPartial, selectionProgress } = require('../src/selection')

test('videos are pre-ticked, samples and extras left out', () => {
    const files = [
        { path: 'Movie/Movie.mkv', length: 4e9 },
        { path: 'Movie/Sample/movie-sample.mkv', length: 3e7 },
        { path: 'Movie/Movie.nfo', length: 2e3 }
    ]
    assert.deepStrictEqual(defaultSelection(files), [true, false, false])
})

test('torrents without video tick everything', () => {
    assert.deepStrictEqual(defaultSelection([{ path: 'a.iso', length: 1 }, { path: 'b.txt', length: 1 }]), [true, true])
})

test('a video that is only a sample is still ticked', () => {
    assert.deepStrictEqual(defaultSelection([{ path: 'sample.mp4', length: 1 }, { path: 'x.txt', length: 1 }]), [true, false])
})

test('normalizeSelection rejects wrong sizes and empty choices', () => {
    assert.deepStrictEqual(normalizeSelection([true, 1, false], 3), [true, false, false])
    assert.strictEqual(normalizeSelection([false, false], 2), null)
    assert.strictEqual(normalizeSelection([true], 2), null)
    assert.strictEqual(normalizeSelection('all', 2), null)
})

test('progress and size cover only the chosen files', () => {
    const files = [{ length: 100, downloaded: 100 }, { length: 900, downloaded: 0 }, { length: 100, downloaded: 50 }]
    const result = selectionProgress(files, [true, false, true])
    assert.deepStrictEqual(result, { length: 200, downloaded: 150, progress: 0.75 })
    assert.strictEqual(isPartial([true, false]), true)
    assert.strictEqual(isPartial([true, true]), false)
    assert.strictEqual(isPartial(null), false)
})
