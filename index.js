'use strict'

const {Worker} = require('worker_threads')
const afterAll = require('after-all')

const noop = function () {}

module.exports = Pool

function Pool (opts) {
  opts = opts || {}
  this._workers = new Set()
  this._queue = []
  this._max = opts.max || 1

  Object.defineProperty(this, 'size', {
    configurable: true,
    enumerable: true,
    get: function () {
      return this._workers.size
    }
  })
}

Pool.prototype.acquire = function (filename, opts, cb) {
  if (this._workers.size === this._max) {
    this._queue.push([filename, opts, cb])
    return
  }

  const self = this

  const worker = new Worker(filename, opts)
  worker.once('error', done)
  worker.once('exit', done)

  this._workers.add(worker)

  process.nextTick(cb.bind(null, worker))

  function done () {
    self._workers.delete(worker)
    worker.removeListener('error', done)
    worker.removeListener('exit', done)
    const next = self._queue.shift()
    if (next) self.acquire.apply(self, next)
  }
}

Pool.prototype.destroy = function (cb = noop) {
  const next = afterAll(cb)
  for (let worker of this._workers) {
    worker.terminate(next())
  }
}
